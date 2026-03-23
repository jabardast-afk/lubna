import type { Env } from "../env";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";
import type { ChatMessage } from "@lubna/shared/types";

const NONCE_PREFIX = "oauth_state:";
const CHAT_PREFIX = "chat:";
const CHAT_MEMORY_PREFIX = "chat_memory:";
const CHAT_MEMORY_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function issueStateNonce(env: Env, ttlSeconds = 600): Promise<string> {
  const state = crypto.randomUUID();
  await env.lubna_kv.put(`${NONCE_PREFIX}${state}`, "1", { expirationTtl: ttlSeconds });
  return state;
}

export async function consumeStateNonce(env: Env, state: string): Promise<boolean> {
  const key = `${NONCE_PREFIX}${state}`;
  const exists = await env.lubna_kv.get(key);
  if (!exists) {
    return false;
  }
  await env.lubna_kv.delete(key);
  return true;
}

export function getChatHistoryKey(userId: string, conversationId: string): string {
  return `${CHAT_PREFIX}${userId}:${conversationId}`;
}

export async function readChatHistory(env: Env, userId: string, conversationId: string): Promise<ChatMessage[]> {
  const raw = await env.lubna_kv.get(getChatHistoryKey(userId, conversationId));
  if (!raw) return [];

  try {
    const decompressed = decompressFromUTF16(raw);
    if (!decompressed) return [];
    const parsed = JSON.parse(decompressed) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read compressed chat history", error);
    return [];
  }
}

export async function writeChatHistory(env: Env, userId: string, conversationId: string, messages: ChatMessage[]): Promise<void> {
  const payload = compressToUTF16(JSON.stringify(messages));
  await env.lubna_kv.put(getChatHistoryKey(userId, conversationId), payload);
}

export async function deleteChatHistory(env: Env, userId: string, conversationId: string): Promise<void> {
  await env.lubna_kv.delete(getChatHistoryKey(userId, conversationId));
}

function getChatMemoryKey(userId: string, conversationId: string): string {
  return `${CHAT_MEMORY_PREFIX}${userId}:${conversationId}`;
}

export async function readChatMemorySnapshot(
  env: Env,
  userId: string,
  conversationId: string
): Promise<Array<{ key: string; value: string }>> {
  const raw = await env.lubna_kv.get(getChatMemoryKey(userId, conversationId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<{ key: string; value: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read chat memory snapshot", error);
    return [];
  }
}

export async function writeChatMemorySnapshot(
  env: Env,
  userId: string,
  conversationId: string,
  memories: Array<{ key: string; value: string }>
): Promise<void> {
  await env.lubna_kv.put(getChatMemoryKey(userId, conversationId), JSON.stringify(memories), {
    expirationTtl: CHAT_MEMORY_TTL_SECONDS
  });
}

export async function deleteChatMemorySnapshot(env: Env, userId: string, conversationId: string): Promise<void> {
  await env.lubna_kv.delete(getChatMemoryKey(userId, conversationId));
}
