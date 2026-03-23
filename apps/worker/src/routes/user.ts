import { Hono } from "hono";
import type { AppBindings } from "../env";
import { patchUserPrefs } from "../lib/d1";

export const userRoutes = new Hono<AppBindings>();

userRoutes.get("/profile", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  return c.json({
    prefs: user.prefs,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
});

userRoutes.patch("/prefs", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { language?: string; theme?: string; voiceId?: string | null } | null;
  if (!body) {
    return c.json({ error: "invalid payload" }, 400);
  }

  const updated = await patchUserPrefs(c.env, user.id, body);
  return c.json({ user: updated });
});
