import type { AppModule, UserPrefs } from "@lubna/shared/types";
import type { ConversationRow, ConversationSummaryRow, Env, GoogleProfile, MemoryRow, UserRecord } from "../env";
import { deleteChatHistory, deleteChatMemorySnapshot } from "./kv";

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

  await env.DB.prepare(
    `INSERT INTO user_preferences (userId, voiceId, language, theme, updatedAt)
     VALUES (?, NULL, 'auto', 'midnight-rose', ?)
     ON CONFLICT(userId) DO NOTHING`
  )
    .bind(profile.sub, timestamp)
    .run();

  const user = await getUserById(env, profile.sub);
  if (!user) throw new Error("failed to upsert user");
  return user;
}

export async function getUserById(env: Env, userId: string): Promise<UserRecord | null> {
  const row = await env.DB.prepare(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.picture,
       u.created_at,
       u.last_active,
       COALESCE(p.language, u.language_pref, 'auto') AS language,
       COALESCE(p.theme, 'midnight-rose') AS theme,
       p.voiceId AS voiceId
     FROM users u
     LEFT JOIN user_preferences p ON p.userId = u.id
     WHERE u.id = ?
     LIMIT 1`
  )
    .bind(userId)
    .first<{
      id: string;
      email: string;
      name: string;
      picture?: string;
      created_at: number;
      last_active?: number;
      language: string;
      theme: string;
      voiceId?: string | null;
    }>();
  if (!row) return null;

  const prefs: UserPrefs = {
    language: row.language ?? "auto",
    languagePref: row.language ?? "auto",
    theme: row.theme ?? "midnight-rose",
    voiceId: row.voiceId ?? null,
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
    `INSERT INTO conversations (id, user_id, title, module, message_count, last_message, kv_updated_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, NULL, NULL, ?, ?)`
  )
    .bind(id, userId, title, module, timestamp, timestamp)
    .run();
  return (await getConversationById(env, userId, id)) as ConversationRow;
}

export async function getConversationById(env: Env, userId: string, conversationId: string): Promise<ConversationRow | null> {
  return env.DB
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(conversationId, userId)
    .first<ConversationRow>();
}

export async function getLatestConversation(env: Env, userId: string): Promise<ConversationRow | null> {
  return env.DB
    .prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
    .bind(userId)
    .first<ConversationRow>();
}

export async function updateConversationSnapshot(
  env: Env,
  conversationId: string,
  input: { title?: string; lastMessage?: string; messageCount: number; kvUpdatedAt?: number }
): Promise<void> {
  await env.DB.prepare(
    `UPDATE conversations
     SET title = COALESCE(?, title),
         last_message = ?,
         message_count = ?,
         kv_updated_at = ?,
         updated_at = ?
     WHERE id = ?`
  )
    .bind(input.title ?? null, input.lastMessage ?? null, input.messageCount, input.kvUpdatedAt ?? now(), now(), conversationId)
    .run();
}

export async function getMessagesForUser(
  env: Env,
  userId: string,
  conversationId?: string
): Promise<{ conversation: ConversationRow | null }> {
  const conversation = conversationId
    ? await getConversationById(env, userId, conversationId)
    : await getLatestConversation(env, userId);
  return { conversation };
}

export async function listConversations(env: Env, userId: string, limit = 20): Promise<ConversationSummaryRow[]> {
  const result = await env.DB.prepare(
    `SELECT
       id,
       title,
       module,
       created_at,
       updated_at,
       message_count,
       last_message
     FROM conversations
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`
  )
    .bind(userId, limit)
    .all<ConversationSummaryRow>();

  return result.results;
}

export async function pruneUserConversations(env: Env, userId: string, keep = 20): Promise<void> {
  const overflow = await env.DB.prepare(
    `SELECT id
     FROM conversations
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT -1 OFFSET ?`
  )
    .bind(userId, keep)
    .all<{ id: string }>();

  for (const conversation of overflow.results) {
    await env.DB.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(conversation.id).run();
    await env.DB.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").bind(conversation.id, userId).run();
    await deleteChatHistory(env, userId, conversation.id);
    await deleteChatMemorySnapshot(env, userId, conversation.id);
  }
}

export async function upsertMemoryFact(
  env: Env,
  userId: string,
  input: { key: string; value: string }
): Promise<MemoryRow> {
  const id = crypto.randomUUID();
  const timestamp = now();
  const normalizedKey = input.key.trim().toLowerCase();
  await env.DB.prepare(
    `INSERT INTO user_memory (id, userId, key, value, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId, key) DO UPDATE SET
       value = excluded.value,
       updatedAt = excluded.updatedAt`
  )
    .bind(id, userId, normalizedKey, input.value.trim(), timestamp)
    .run();

  return (await env.DB.prepare("SELECT * FROM user_memory WHERE userId = ? AND key = ? LIMIT 1").bind(userId, normalizedKey).first<MemoryRow>()) as MemoryRow;
}

export async function listMemoryFacts(env: Env, userId: string): Promise<MemoryRow[]> {
  const result = await env.DB.prepare("SELECT * FROM user_memory WHERE userId = ? ORDER BY updatedAt DESC").bind(userId).all<MemoryRow>();
  return result.results;
}

export async function getMemoryFact(env: Env, userId: string, key: string): Promise<MemoryRow | null> {
  return env.DB
    .prepare("SELECT * FROM user_memory WHERE userId = ? AND key = ? LIMIT 1")
    .bind(userId, key.trim().toLowerCase())
    .first<MemoryRow>();
}

export async function deleteMemoryFact(env: Env, userId: string, key?: string): Promise<boolean> {
  const statement = key
    ? env.DB.prepare("DELETE FROM user_memory WHERE userId = ? AND key = ?").bind(userId, key.trim().toLowerCase())
    : env.DB.prepare("DELETE FROM user_memory WHERE userId = ?").bind(userId);
  const result = await statement.run();
  return (result.meta.changes ?? 0) > 0;
}

export async function patchUserPrefs(
  env: Env,
  userId: string,
  patch: Partial<Pick<UserPrefs, "language" | "theme" | "voiceId">>
): Promise<UserRecord> {
  const existing = await getUserById(env, userId);
  if (!existing) throw new Error("user not found");

  const nextLanguage = patch.language ?? existing.prefs.language ?? existing.prefs.languagePref ?? "auto";
  const nextTheme = patch.theme ?? existing.prefs.theme ?? "midnight-rose";
  const nextVoiceId = patch.voiceId === undefined ? existing.prefs.voiceId ?? null : patch.voiceId;

  await env.DB.prepare(
    `INSERT INTO user_preferences (userId, voiceId, language, theme, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       voiceId = excluded.voiceId,
       language = excluded.language,
       theme = excluded.theme,
       updatedAt = excluded.updatedAt`
  )
    .bind(userId, nextVoiceId, nextLanguage, nextTheme, now())
    .run();

  await env.DB.prepare("UPDATE users SET language_pref = ?, last_active = ? WHERE id = ?")
    .bind(nextLanguage, now(), userId)
    .run();

  const user = await getUserById(env, userId);
  if (!user) throw new Error("user not found");
  return user;
}
