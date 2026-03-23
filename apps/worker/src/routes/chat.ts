import { Hono } from "hono";
import type { Context } from "hono";
import type { AppBindings, ChatInput } from "../env";
import type { AppModule, ChatMessage } from "@lubna/shared/types";
import {
  createConversation,
  getConversationById,
  getMessagesForUser,
  listConversations,
  pruneUserConversations,
  updateConversationSnapshot
} from "../lib/d1";
import { getFreshGeminiToken } from "../lib/geminiToken";
import { readChatHistory, readChatMemorySnapshot, writeChatHistory, writeChatMemorySnapshot } from "../lib/kv";
import { extractAndPersistMemories } from "./memory";

function normalizeLimit(value: string | undefined, fallback = 20): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, parsed));
}

function detectLanguage(message: string): string {
  if (/[\u4E00-\u9FFF]/.test(message)) return "zh";
  if (/[\u0980-\u09FF]/.test(message)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(message)) return "ta";
  if (/[\u0900-\u097F]/.test(message)) return "hi";
  if (/[a-zA-Z]/.test(message) && /(yaar|nahi|mujhe|bohot|acha|haan)/i.test(message)) return "hinglish";
  return "en";
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

function buildSystemPrompt(language: string, module: AppModule, memory: Array<{ key: string; value: string }>): string {
  const memoryBlock = memory
    .slice(0, 15)
    .map((entry) => `- ${entry.key}: ${entry.value}`)
    .join("\n");

  return `You are Lubna — a confident, warm, witty, slightly spicy AI best friend.
You speak naturally, like a real person, never robotic or formal.
You give real talk, not generic advice. You remember who you're talking to.

What you know about this user:
${memoryBlock || "(none yet)"}

Use this to personalise every response. Reference past context naturally when relevant.
Never say "as an AI" — you are Lubna, full stop.

Language hint: ${language}
Module hint: ${module}`;
}

async function generateWithGemini(
  env: AppBindings["Bindings"],
  userId: string,
  message: string,
  language: string,
  module: AppModule,
  memory: Array<{ key: string; value: string }>
): Promise<string> {
  const token = await getFreshGeminiToken(userId, env);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
  if (env.GOOGLE_CLOUD_PROJECT_ID && env.GOOGLE_CLOUD_PROJECT_ID !== "SET_ME") {
    headers["x-goog-user-project"] = env.GOOGLE_CLOUD_PROJECT_ID;
  }

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers,
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
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function getConversationMemorySnapshot(
  c: Context<AppBindings>,
  userId: string,
  conversationId: string,
  isNewConversation: boolean
): Promise<Array<{ key: string; value: string }>> {
  if (isNewConversation) {
    // New sessions always start by reading memory facts from D1 before the first Gemini call.
    const memories = await c.env.DB.prepare(
      "SELECT key, value FROM user_memory WHERE userId = ? ORDER BY updatedAt DESC LIMIT 15"
    )
      .bind(userId)
      .all<{ key: string; value: string }>();
    const snapshot = memories.results;
    await writeChatMemorySnapshot(c.env, userId, conversationId, snapshot);
    return snapshot;
  }

  return readChatMemorySnapshot(c.env, userId, conversationId);
}

function buildMessage(role: "user" | "assistant", content: string, language?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    language,
    createdAt: Date.now()
  };
}

export const chatRoutes = new Hono<AppBindings>();

chatRoutes.post("/message", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const body = parseChatInput(c.get("parsedBody")) ?? parseChatInput(await c.req.json().catch(() => null));
  if (!body?.message.trim()) return c.json({ error: "message is required" }, 400);

  const isNewConversation = !body.conversationId;
  const activeConversation = body.conversationId
    ? await getConversationById(c.env, user.id, body.conversationId)
    : await createConversation(c.env, user.id, body.message.slice(0, 48), body.module ?? "general");
  if (!activeConversation) return c.json({ error: "conversation not found" }, 404);

  const preferredLanguage = user.prefs.language && user.prefs.language !== "auto" ? user.prefs.language : undefined;
  const language = body.language ?? preferredLanguage ?? detectLanguage(body.message);
  const existingMessages = await readChatHistory(c.env, user.id, activeConversation.id);
  const userMessage = buildMessage("user", body.message, language);

  const memory = await getConversationMemorySnapshot(c, user.id, activeConversation.id, isNewConversation);
  let reply: string;
  try {
    reply = await generateWithGemini(c.env, user.id, body.message, language, body.module ?? "general", memory);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown Gemini failure";
    return c.json(
      {
        error: "ai_generation_failed",
        detail
      },
      502
    );
  }

  const assistantMessage = buildMessage("assistant", reply, language);
  const nextMessages = [...existingMessages, userMessage, assistantMessage];

  // Persist the full compressed message array so history is always recoverable from KV.
  await writeChatHistory(c.env, user.id, activeConversation.id, nextMessages);
  await updateConversationSnapshot(c.env, activeConversation.id, {
    title: existingMessages.length ? undefined : body.message.slice(0, 48),
    lastMessage: assistantMessage.content,
    messageCount: nextMessages.length,
    kvUpdatedAt: Date.now()
  });
  await pruneUserConversations(c.env, user.id, 20);

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

chatRoutes.post("/conversations/:id/finalize", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const conversation = await getConversationById(c.env, user.id, c.req.param("id"));
  if (!conversation) return c.json({ error: "conversation not found" }, 404);

  const messages = await readChatHistory(c.env, user.id, conversation.id);
  const facts = await extractAndPersistMemories(c, user.id, messages);
  await updateConversationSnapshot(c.env, conversation.id, {
    lastMessage: messages.at(-1)?.content,
    messageCount: messages.length,
    kvUpdatedAt: Date.now()
  });

  return c.json({ ok: true, facts });
});

chatRoutes.get("/history/:n", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const limit = normalizeLimit(c.req.param("n"));
  const conversationId = c.req.query("conversationId") ?? undefined;
  const { conversation } = await getMessagesForUser(c.env, user.id, conversationId);
  if (!conversation) return c.json({ conversation: null, messages: [] });

  const messages = await readChatHistory(c.env, user.id, conversation.id);
  return c.json({ conversation, messages: messages.slice(-limit) });
});

chatRoutes.get("/conversations", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const limit = normalizeLimit(c.req.query("limit"), 20);
  const conversations = await listConversations(c.env, user.id, limit);
  return c.json({ conversations });
});
