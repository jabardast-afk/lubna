export interface ChatRequest {
  message: string;
  conversationId?: string;
  module?: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  language: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  module?: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  last_message?: string;
}

export interface ConversationHistoryResponse {
  conversation: {
    id: string;
    title: string;
    module?: string;
    created_at: number;
    updated_at: number;
  } | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    language?: string;
    created_at: number;
  }>;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorPayload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
    throw new Error(errorPayload?.detail ?? errorPayload?.error ?? "Chat failed");
  }

  return res.json() as Promise<ChatResponse>;
}

export async function getSession() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function getConversationHistory(conversationId?: string) {
  const url = new URL(`${API_BASE}/chat/history/100`);
  if (conversationId) {
    url.searchParams.set("conversationId", conversationId);
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch conversation history");
  }
  return (await res.json()) as ConversationHistoryResponse;
}

export async function listConversations() {
  const res = await fetch(`${API_BASE}/chat/conversations?limit=20`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return (await res.json()) as { conversations: ConversationSummary[] };
}
