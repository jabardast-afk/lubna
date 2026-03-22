import { Hono } from "hono";
import type { AppBindings, ChatInput } from "../env";
import type { AppModule } from "@lubna/shared/types";
import { ensureConversation, getMessagesForUser, insertMessage, listMemoryFacts, upsertMemoryFact } from "../lib/d1";

function normalizeLimit(value: string | undefined, fallback = 20): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, parsed));
}

function buildAssistantReply(message: string, memory: Awaited<ReturnType<typeof listMemoryFacts>>): string {
  const memoryHighlights = memory.slice(0, 3).map((fact) => `${fact.key}: ${fact.value}`).join("; ");
  const prefix = "I hear you, and I’ve got you. ";
  const insight = memoryHighlights ? `I'm remembering ${memoryHighlights}. ` : "";
  return `${prefix}${insight}Tell me a bit more so we can figure this out together. You said: "${message}".`;
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

  const memory = await listMemoryFacts(c.env, user.id);
  const reply = buildAssistantReply(body.message, memory);
  const language = body.language ?? detectLanguage(body.message);
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
