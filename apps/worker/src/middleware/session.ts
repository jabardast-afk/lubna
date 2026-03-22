import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import type { AppBindings, SessionPayload } from "../env";
import { SESSION_COOKIE } from "@lubna/shared/constants";
import { getUserById } from "../lib/d1";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function setSessionCookieValue(c: Context<AppBindings>, sessionId: string): void {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "None",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookieValue(c: Context<AppBindings>): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: true,
    sameSite: "None"
  });
}

export async function createSession(c: Context<AppBindings>, data: Omit<SessionPayload, "id" | "createdAt">): Promise<SessionPayload> {
  const session: SessionPayload = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...data
  };
  await c.env.KV.put(`session:${session.id}`, JSON.stringify(session), { expirationTtl: SESSION_TTL_SECONDS });
  setSessionCookieValue(c, session.id);
  return session;
}

export async function destroySession(c: Context<AppBindings>): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    await c.env.KV.delete(`session:${sessionId}`);
  }
  clearSessionCookieValue(c);
}

export const sessionMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    const raw = await c.env.KV.get(`session:${sessionId}`);
    const session = raw ? (JSON.parse(raw) as SessionPayload) : null;
    if (session) {
      c.set("session", session);
      const user = await getUserById(c.env, session.userId);
      if (user) {
        c.set("user", user);
      }
    }
  }
  await next();
};
