import { Hono } from "hono";
import type { AppBindings, ChatInput } from "../env";
import type { AppModule } from "@lubna/shared/types";
import { ensureConversation, getMessagesForUser, insertMessage, listMemoryFacts, upsertMemoryFact } from "../lib/d1";
import { getFreshGeminiToken } from "../lib/geminiToken";

function normalizeLimit(value: string | undefined, fallback = 20): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, parsed));
}

function isIdentityQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return /\bwho are you\b/.test(lower) || /tum (kaun|kon) ho/.test(lower) || /aap kaun ho/.test(lower);
}

function isDistressMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return /(dimag kharab|stressed|anxious|tensed|pareshan|bura lag raha|overwhelmed)/.test(lower);
}

function buildFallbackReply(
  message: string,
  language: string,
  module: AppModule,
  memory: Awaited<ReturnType<typeof listMemoryFacts>>
): string {
  const memoryHint = memory[0] ? `Also, I remember ${memory[0].key}: ${memory[0].value}. ` : "";
  if (isIdentityQuestion(message)) {
    if (language === "hi" || language === "hinglish") {
      return "Main Lubna hoon, tumhari AI bestie. Main sunungi bhi, practical help bhi dungi, aur bina judge kiye saath rahoongi. Bolo, abhi kis cheez mein help chahiye?";
    }
    return "I’m Lubna, your AI bestie. I’m here to listen, help you think clearly, and support you without judgment. What do you need right now?";
  }

  if (isDistressMessage(message)) {
    if (language === "hi" || language === "hinglish") {
      return `${memoryHint}Aaj ka din heavy lag raha hai, I get it. Chalo 2 minute reset karte hain: 1) 5 deep breaths, 2) paani ka ek glass, 3) jo sabse urgent tension hai woh ek line mein batao. Usko abhi saath mein solve karte hain.`;
    }
    return `${memoryHint}That sounds really heavy, and I’m with you. Let’s do a 2-minute reset: 1) five deep breaths, 2) a glass of water, 3) tell me the single most urgent stress point. We’ll tackle that first.`;
  }

  if (module === "career") {
    return language === "hi" || language === "hinglish"
      ? `${memoryHint}Career mode on. Situation 2 lines mein batao: kya hua, kiske saath hua. Main exact script aur next step bana deti hoon.`
      : `${memoryHint}Career mode on. Tell me the situation in two lines: what happened and with whom. I’ll give you an exact script and next step.`;
  }

  return language === "hi" || language === "hinglish"
    ? `${memoryHint}Samajh rahi hoon. Main tumhare saath hoon. Chalo short mein batate hain: abhi tumhe vent karna hai ya direct solution chahiye?`
    : `${memoryHint}I hear you and I’m with you. Do you want to vent first, or do you want a direct step-by-step solution?`;
}

function buildSystemPrompt(language: string, module: AppModule, memory: Awaited<ReturnType<typeof listMemoryFacts>>): string {
  const memoryContext = memory.slice(0, 8).map((m) => `- ${m.key}: ${m.value}`).join("\n") || "(none yet)";
  return [
    "You are Lubna: a warm, practical AI best friend for women.",
    "Never say you are a language model. Never parrot the user's message back verbatim.",
    "Respond in the same language/style as user input.",
    "If user writes Hinglish, respond in natural Hinglish.",
    "Be emotionally intelligent: validate first, then help concretely.",
    "If asked factual questions (science, career, etc.), give clear, useful explanations.",
    `Current language hint: ${language}.`,
    `Current module: ${module}.`,
    "Known memory:",
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
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 700
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
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
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
  if (!body || typeof body !== "object") {
    return null;
  }
  const candidate = body as Record<string, unknown>;
  const isValidModule = (value: string): value is AppModule =>
    ["fashion", "relationships", "health", "career", "general"].includes(value);

  return typeof candidate.message === "string"
    ? {
        message: candidate.message,
        conversationId: typeof candidate.conversationId === "string" ? candidate.conversationId : undefined,
        module: typeof candidate.module === "string" && isValidModule(candidate.module) ? candidate.module : undefined,
        language: typeof candidate.language === "string" ? candidate.language : undefined,
      }
    : null;
}

export const chatRoutes = new Hono<AppBindings>();

chatRoutes.post("/message", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = parseChatInput(c.get("parsedBody")) ?? parseChatInput(await c.req.json().catch(() => null));
  if (!body?.message.trim()) {
    return c.json({ error: "message is required" }, 400);
  }

  const activeConversation = body.conversationId
    ? await c.env.DB.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1").bind(body.conversationId, user.id).first<{ id: string }>()
    : await ensureConversation(c.env, user.id, body.message.slice(0, 48), body.module);

  if (!activeConversation) {
    return c.json({ error: "conversation not found" }, 404);
  }

  await insertMessage(c.env, {
    conversationId: activeConversation.id,
    role: "user",
    content: body.message,
    language: body.language ?? detectLanguage(body.message)
  });

  const language = body.language ?? detectLanguage(body.message);
  const memory = await listMemoryFacts(c.env, user.id);
  let reply: string;
  try {
    reply = await generateWithGemini(c.env, user.id, body.message, language, body.module ?? "general", memory);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    reply = buildFallbackReply(body.message, language, body.module ?? "general", memory);
  }
  const assistantMessage = await insertMessage(c.env, {
    conversationId: activeConversation.id,
    role: "assistant",
    content: reply,
    language
  });
  c.executionCtx.waitUntil(extractSimpleMemory(c.env, user.id, body.message));

  return c.json({
    reply: assistantMessage.content,
    language,
    conversationId: activeConversation.id,
  });
});

chatRoutes.post("/stream", async (c) => {
  const response = await c.req.json().catch(() => null) as { message?: string } | null;
  if (!response?.message) return c.json({ error: "message is required" }, 400);
  return c.json({ stream: false, reply: `Streaming stub: ${response.message}` });
});

chatRoutes.get("/history/:n", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const limit = normalizeLimit(c.req.param("n"));
  const conversationId = c.req.query("conversationId") ?? undefined;
  const { conversation, messages } = await getMessagesForUser(c.env, user.id, limit, conversationId);

  return c.json({
    conversation,
    messages,
  });
});
