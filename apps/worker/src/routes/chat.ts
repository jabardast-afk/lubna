import { Hono } from "hono";
import type { AppBindings, ChatInput } from "../env";
import type { AppModule } from "@lubna/shared/types";
import { ensureConversation, getMessagesForUser, insertMessage, listMemoryFacts, upsertMemoryFact } from "../lib/d1";
import { getFreshGeminiToken } from "../lib/geminiToken";

function normalizeLimit(value: string | undefined, fallback = 20): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, parsed));
}

function detectLanguage(message: string): string {
  if (/[\u0980-\u09FF]/.test(message)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(message)) return "ta";
  if (/[\u0900-\u097F]/.test(message)) return "hi";
  if (/[a-zA-Z]/.test(message) && /(yaar|nahi|mujhe|bohot|acha|haan)/i.test(message)) return "hinglish";
  return "en";
}

async function extractSimpleMemory(env: AppBindings["Bindings"], userId: string, message: string) {
  const lower = message.toLowerCase();
  const cityMatch = lower.match(/\b(?:i live in|from)\s+([a-z\s]+)/i);
  if (cityMatch?.[1]) {
    await upsertMemoryFact(env, userId, { key: "city", value: cityMatch[1].trim(), confidence: 0.8 });
  }
}

function parseChatInput(body: unknown): ChatInput | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  const isValidModule = (value: string): value is AppModule =>
    ["fashion", "relationships", "health", "career", "general"].includes(value);
  if (typeof candidate.message !== "string") return null;

  return {
    message: candidate.message,
    conversationId: typeof candidate.conversationId === "string" ? candidate.conversationId : undefined,
    module: typeof candidate.module === "string" && isValidModule(candidate.module) ? candidate.module : undefined,
    language: typeof candidate.language === "string" ? candidate.language : undefined
  };
}

function buildSystemPrompt(language: string, module: AppModule, memory: Awaited<ReturnType<typeof listMemoryFacts>>): string {
  const memoryContext = memory.slice(0, 10).map((m) => `- ${m.key}: ${m.value}`).join("\n") || "(none yet)";
  return [
    "You are Lubna, a warm, witty, emotionally intelligent AI best friend for women.",
    "Respond naturally and directly to the user's request.",
    "Do not repeat or quote the user's message unless explicitly asked.",
    "Match the user's language and code-switching style exactly.",
    "For Hinglish, reply in natural Hinglish.",
    "Validate emotion first when user is distressed, then give practical help.",
    "For knowledge questions, give clear explanation with examples.",
    "Never start with 'As an AI'.",
    "Safety: refuse harmful instructions, handle crisis with empathy and resources.",
    `Language hint: ${language}`,
    `Module hint: ${module}`,
    "Memory context:",
    memoryContext
  ].join("\n");
}

async function generateWithGemini(
  env: AppBindings["Bindings"],
  userId: string,
  message: string,
  language: string,
  module: AppModule,
  memory: Awaited<ReturnType<typeof listMemoryFacts>>
): Promise<string> {
  const token = await getFreshGeminiToken(userId, env);
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemPrompt(language, module, memory) }]
      },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 900
      }
    })
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${bodyText}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

export const chatRoutes = new Hono<AppBindings>();

chatRoutes.post("/message", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const body = parseChatInput(c.get("parsedBody")) ?? parseChatInput(await c.req.json().catch(() => null));
  if (!body?.message.trim()) return c.json({ error: "message is required" }, 400);

  const activeConversation = body.conversationId
    ? await c.env.DB.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1").bind(body.conversationId, user.id).first<{ id: string }>()
    : await ensureConversation(c.env, user.id, body.message.slice(0, 48), body.module);
  if (!activeConversation) return c.json({ error: "conversation not found" }, 404);

  const language = body.language ?? detectLanguage(body.message);

  await insertMessage(c.env, {
    conversationId: activeConversation.id,
    role: "user",
    content: body.message,
    language
  });

  const memory = await listMemoryFacts(c.env, user.id);
  let reply: string;
  try {
    reply = await generateWithGemini(c.env, user.id, body.message, language, body.module ?? "general", memory);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return c.json(
      {
        error: "ai_generation_failed",
        detail: "Lubna could not generate a response from Gemini. Please re-login once and try again."
      },
      502
    );
  }

  const assistantMessage = await insertMessage(c.env, {
    conversationId: activeConversation.id,
    role: "assistant",
    content: reply,
    language
  });

  c.executionCtx?.waitUntil(extractSimpleMemory(c.env, user.id, body.message));
  return c.json({
    reply: assistantMessage.content,
    language,
    source: "gemini",
    conversationId: activeConversation.id
  });
});

chatRoutes.post("/stream", async (c) => {
  const response = (await c.req.json().catch(() => null)) as { message?: string } | null;
  if (!response?.message) return c.json({ error: "message is required" }, 400);
  return c.json({ stream: false, note: "stream route not implemented yet; use /chat/message for AI response" }, 501);
});

chatRoutes.get("/history/:n", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const limit = normalizeLimit(c.req.param("n"));
  const conversationId = c.req.query("conversationId") ?? undefined;
  const { conversation, messages } = await getMessagesForUser(c.env, user.id, limit, conversationId);
  return c.json({ conversation, messages });
});
