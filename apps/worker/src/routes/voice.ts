import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import type { AppBindings } from "../env";

export const voiceRoutes = new Hono<AppBindings>();

voiceRoutes.post("/tts", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { text?: string; voice?: string } | null;
  if (!body?.text) {
    return c.json({ error: "text is required" }, 400);
  }

  return c.json({
    provider: "placeholder",
    voice: body.voice ?? "default",
    audioUrl: null,
    text: body.text,
  });
});

voiceRoutes.get(
  "/live",
  upgradeWebSocket(() => {
    return {
      onOpen(_: unknown, ws: any) {
        ws.send(JSON.stringify({ type: "ready", provider: "placeholder", message: "voice live stub" }));
      },
      onMessage(event: MessageEvent, ws: any) {
        const text = typeof event.data === "string" ? event.data : "";
        ws.send(JSON.stringify({ type: "echo", text }));
      },
    };
  }),
);
