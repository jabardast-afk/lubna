import type { Env } from "../env";

const NONCE_PREFIX = "oauth_state:";

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
