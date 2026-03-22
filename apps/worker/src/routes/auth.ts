import { Hono } from "hono";
import type { Context } from "hono";
import type { AppBindings, GoogleProfile } from "../env";
import { consumeStateNonce, issueStateNonce } from "../lib/kv";
import { createSession, destroySession } from "../middleware/session";
import { upsertGoogleUser } from "../lib/d1";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function isNativeUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false;
  }
  return /capacitor|cordova|flutter|okhttp|wv|lubna/i.test(userAgent);
}

function buildRedirectTarget(userAgent: string | undefined): string {
  return isNativeUserAgent(userAgent) ? "com.lubna.app://auth/success" : "/chat";
}

function absoluteUrl(base: string | undefined, path: string): string {
  if (!base) {
    return path;
  }
  return new URL(path, base).toString();
}

export const authRoutes = new Hono<AppBindings>();

async function startGoogleAuth(c: Context<AppBindings>) {
  const state = await issueStateNonce(c.env);
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/generative-language.retriever",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return c.redirect(url.toString(), 302);
}

authRoutes.get("/login", startGoogleAuth);
authRoutes.post("/google", startGoogleAuth);
authRoutes.get("/google", startGoogleAuth);
authRoutes.get("/google/start", startGoogleAuth);

async function callbackHandler(c: Context<AppBindings>) {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=access_denied`);
  }

  if (!code || !state) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=missing_code_or_state`);
  }

  const validState = await consumeStateNonce(c.env, state);
  if (!validState) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=invalid_state`);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=token_exchange_failed`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokenJson.access_token) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=missing_access_token`);
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!profileResponse.ok) {
    return c.redirect(`${c.env.APP_URL ?? ""}/?error=userinfo_failed`);
  }

  const profile = (await profileResponse.json()) as GoogleProfile;
  const user = await upsertGoogleUser(c.env, profile);
  if (tokenJson.refresh_token) {
    await c.env.KV.put(
      `user:${profile.sub}:gemini_token`,
      JSON.stringify({
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
        expires_at: Date.now() + (tokenJson.expires_in ?? 3600) * 1000
      })
    );
  }
  await createSession(c, {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture
  });

  const redirectTarget = buildRedirectTarget(c.req.header("user-agent"));
  if (redirectTarget.startsWith("com.lubna.app://")) {
    return c.redirect(redirectTarget, 302);
  }
  return c.redirect(absoluteUrl(c.env.APP_URL, redirectTarget), 302);
}

authRoutes.get("/callback", callbackHandler);
authRoutes.get("/google/callback", callbackHandler);

authRoutes.get("/me", (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ authenticated: false }, 401);
  }
  return c.json(session);
});

function logoutHandler(c: Context<AppBindings>) {
  return destroySession(c).then(() => c.json({ ok: true }));
}

authRoutes.get("/logout", logoutHandler);
authRoutes.post("/logout", logoutHandler);
