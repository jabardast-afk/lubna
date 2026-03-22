export type AppModule = "fashion" | "relationships" | "health" | "career" | "general";

export type ChatRole = "user" | "assistant";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  language?: string;
  createdAt: number;
}

export interface MemoryFact {
  id?: string;
  key: string;
  value: string;
  confidence?: number;
  updatedAt?: number;
}

export interface UserPrefs {
  languagePref: string;
  tone?: "supportive" | "practical" | "balanced";
}
