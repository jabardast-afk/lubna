import type { AppModule, ChatRole, UserPrefs } from "@lubna/shared/types";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  picture?: string;
  prefs: UserPrefs;
  createdAt: number;
  lastActive?: number;
}

export interface SessionPayload {
  id: string;
  userId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
}

export interface ChatInput {
  message: string;
  conversationId?: string;
  module?: AppModule;
  language?: string;
}

export interface CrisisResult {
  crisis: true;
  message: string;
  resources: {
    international: string;
    indiaIcall: string;
    indiaVandrevala: string;
  };
}

export interface AppVariables {
  session?: SessionPayload;
  user?: UserRecord;
  parsedBody?: unknown;
  crisisResult?: CrisisResult;
  chatMessage?: ChatInput;
}

export interface Env {
  APP_NAME?: string;
  APP_URL?: string;
  FRONTEND_ORIGIN?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  ANTHROPIC_API_KEY?: string;
  lubna_kv: KVNamespace;
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  SESSION_SECRET?: string;
  ELEVENLABS_API_KEY?: string;
}

export interface AppBindings {
  Bindings: Env;
  Variables: AppVariables;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  module?: string;
  message_count: number;
  last_message?: string;
  kv_updated_at?: number;
  created_at: number;
  updated_at: number;
}

export interface ConversationSummaryRow {
  id: string;
  title: string;
  module?: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  last_message?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  language?: string;
  created_at: number;
}

export interface MemoryRow {
  id: string;
  userId: string;
  key: string;
  value: string;
  updatedAt: number;
}
