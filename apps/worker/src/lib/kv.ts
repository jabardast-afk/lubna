import type { Env } from "../env";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";
import type { ChatMessage } from "@lubna/shared/types";

const NONCE_PREFIX = "oauth_state:";
const CHAT_PREFIX = "chat:";

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
