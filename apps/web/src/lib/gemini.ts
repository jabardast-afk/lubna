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

export interface UserProfileResponse {
  prefs: {
    language: string;
    theme?: string;
    voiceId?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
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
    created_at?: number;
    updated_at: number;
  } | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    language?: string;
    created_at: number;
    createdAt?: number;
  }>;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function apiUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(apiUrl("/chat/message"), {
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
  const res = await fetch(apiUrl("/auth/me"), { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function getConversationHistory(conversationId?: string) {
  const url = new URL(apiUrl("/chat/history/100"), window.location.origin);
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
  const res = await fetch(apiUrl("/chat/conversations?limit=20"), { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return (await res.json()) as { conversations: ConversationSummary[] };
}

export async function finalizeConversation(conversationId: string) {
  const res = await fetch(apiUrl(`/chat/conversations/${conversationId}/finalize`), {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) {
    throw new Error("Failed to finalize conversation");
  }
  return res.json();
}

export function finalizeConversationKeepalive(conversationId: string) {
  return fetch(apiUrl(`/chat/conversations/${conversationId}/finalize`), {
    method: "POST",
    credentials: "include",
    keepalive: true
  });
}

export async function extractConversationMemory(messages: ConversationHistoryResponse["messages"]) {
  const res = await fetch(apiUrl("/api/memory/extract"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages })
  });
  if (!res.ok) {
    throw new Error("Failed to extract memory");
  }
  return res.json();
}

export async function getUserProfile() {
  const res = await fetch(apiUrl("/user/profile"), { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch user profile");
  }
  return (await res.json()) as UserProfileResponse;
}

export async function updateUserPreferences(payload: { language?: string; theme?: string; voiceId?: string | null }) {
  const res = await fetch(apiUrl("/user/prefs"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("Failed to update preferences");
  }
  return res.json();
}
