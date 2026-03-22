import type { Env } from "../env";

const NONCE_PREFIX = "oauth_state:";

export async function issueStateNonce(env: Env, ttlSeconds = 600): Promise<string> {
  const state = crypto.randomUUID();
  await env.KV.put(`${NONCE_PREFIX}${state}`, "1", { expirationTtl: ttlSeconds });
  return state;
}

export async function consumeStateNonce(env: Env, state: string): Promise<boolean> {
  const key = `${NONCE_PREFIX}${state}`;
  const exists = await env.KV.get(key);
  if (!exists) {
    return false;
  }
  await env.KV.delete(key);
  return true;
}
