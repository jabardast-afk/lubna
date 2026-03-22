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
