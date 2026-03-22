import type { AppModule, UserPrefs } from "@lubna/shared/types";
import type { ConversationRow, Env, GoogleProfile, MemoryRow, MessageRow, UserRecord } from "../env";

function now(): number {
  return Date.now();
}

export async function upsertGoogleUser(env: Env, profile: GoogleProfile): Promise<UserRecord> {
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, picture, language_pref, created_at, last_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       picture = excluded.picture,
       last_active = excluded.last_active`
  )
    .bind(profile.sub, profile.email, profile.name, profile.picture ?? null, "auto", timestamp, timestamp)
    .run();

  const user = await getUserById(env, profile.sub);
  if (!user) throw new Error("failed to upsert user");
  return user;
}

export async function getUserById(env: Env, userId: string): Promise<UserRecord | null> {
  const row = await env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(userId).first<{
    id: string;
    email: string;
    name: string;
    picture?: string;
    language_pref?: string;
    created_at: number;
    last_active?: number;
  }>();
  if (!row) return null;

  const prefs: UserPrefs = {
    languagePref: row.language_pref ?? "auto",
    tone: "balanced"
  };

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture ?? undefined,
    prefs,
    createdAt: row.created_at,
    lastActive: row.last_active
  };
}

export async function createConversation(env: Env, userId: string, title: string, module: string = "general"): Promise<ConversationRow> {
  const id = crypto.randomUUID();
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO conversations (id, user_id, title, module, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, title, module, timestamp, timestamp)
    .run();
  return (await env.DB.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first<ConversationRow>()) as ConversationRow;
}

export async function getLatestConversation(env: Env, userId: string): Promise<ConversationRow | null> {
  return env.DB
    .prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
    .bind(userId)
    .first<ConversationRow>();
}

export async function ensureConversation(env: Env, userId: string, title: string, module: AppModule = "general"): Promise<ConversationRow> {
  const latest = await getLatestConversation(env, userId);
  if (latest) return latest;
  return createConversation(env, userId, title, module);
}

export async function touchConversation(env: Env, conversationId: string): Promise<void> {
  await env.DB.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").bind(now(), conversationId).run();
}

export async function insertMessage(
  env: Env,
  input: { conversationId: string; role: MessageRow["role"]; content: string; language?: string }
): Promise<MessageRow> {
  const id = crypto.randomUUID();
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, language, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, input.conversationId, input.role, input.content, input.language ?? null, timestamp)
    .run();
  await touchConversation(env, input.conversationId);
  return (await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first<MessageRow>()) as MessageRow;
}

export async function getConversationMessages(env: Env, conversationId: string, limit = 20): Promise<MessageRow[]> {
  const result = await env.DB
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?")
    .bind(conversationId, limit)
    .all<MessageRow>();
  return result.results.reverse();
}

export async function getMessagesForUser(
  env: Env,
  userId: string,
  limit = 20,
  conversationId?: string
): Promise<{ conversation: ConversationRow | null; messages: MessageRow[] }> {
  const conversation = conversationId
    ? await env.DB.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1").bind(conversationId, userId).first<ConversationRow>()
    : await getLatestConversation(env, userId);
  if (!conversation) return { conversation: null, messages: [] };
  return { conversation, messages: await getConversationMessages(env, conversation.id, limit) };
}

export async function upsertMemoryFact(
  env: Env,
  userId: string,
  input: { key: string; value: string; confidence?: number }
): Promise<MemoryRow> {
  const id = crypto.randomUUID();
  const timestamp = now();
  const normalizedKey = input.key.trim().toLowerCase();
  await env.DB.prepare(
    `INSERT INTO memory (id, user_id, key, value, confidence, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET
       value = excluded.value,
       confidence = excluded.confidence,
       updated_at = excluded.updated_at`
  )
    .bind(id, userId, normalizedKey, input.value, input.confidence ?? 0.8, timestamp)
    .run();

  return (await env.DB.prepare("SELECT * FROM memory WHERE user_id = ? AND key = ? LIMIT 1").bind(userId, normalizedKey).first<MemoryRow>()) as MemoryRow;
}

export async function listMemoryFacts(env: Env, userId: string): Promise<MemoryRow[]> {
  const result = await env.DB.prepare("SELECT * FROM memory WHERE user_id = ? ORDER BY updated_at DESC").bind(userId).all<MemoryRow>();
  return result.results;
}

export async function getMemoryFact(env: Env, userId: string, key: string): Promise<MemoryRow | null> {
  return env.DB
    .prepare("SELECT * FROM memory WHERE user_id = ? AND key = ? LIMIT 1")
    .bind(userId, key.trim().toLowerCase())
    .first<MemoryRow>();
}

export async function deleteMemoryFact(env: Env, userId: string, key?: string): Promise<boolean> {
  const statement = key
    ? env.DB.prepare("DELETE FROM memory WHERE user_id = ? AND key = ?").bind(userId, key.trim().toLowerCase())
    : env.DB.prepare("DELETE FROM memory WHERE user_id = ?").bind(userId);
  const result = await statement.run();
  return (result.meta.changes ?? 0) > 0;
}

export async function patchUserPrefs(env: Env, userId: string, patch: Partial<UserPrefs>): Promise<UserRecord> {
  const nextLanguage = patch.languagePref ?? "auto";
  await env.DB.prepare("UPDATE users SET language_pref = ?, last_active = ? WHERE id = ?")
    .bind(nextLanguage, now(), userId)
    .run();
  const user = await getUserById(env, userId);
  if (!user) throw new Error("user not found");
  return user;
}
