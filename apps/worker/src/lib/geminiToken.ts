import type { Env } from "../env";

interface StoredGeminiToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getFreshGeminiToken(userId: string, env: Env): Promise<string> {
  const raw = await env.KV.get(`user:${userId}:gemini_token`);
  if (!raw) throw new Error("No Gemini token for user");

  const token = JSON.parse(raw) as StoredGeminiToken;
  if (token.expires_at > Date.now() + 60_000) {
    return token.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token"
    })
  });

  if (!res.ok) {
    throw new Error("Token refresh failed");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const refreshed: StoredGeminiToken = {
    access_token: data.access_token,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  await env.KV.put(`user:${userId}:gemini_token`, JSON.stringify(refreshed));
  return refreshed.access_token;
}
