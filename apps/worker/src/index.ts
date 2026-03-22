import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./env";
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { memoryRoutes } from "./routes/memory";
import { userRoutes } from "./routes/user";
import { voiceRoutes } from "./routes/voice";
import { guardrailsMiddleware } from "./middleware/guardrails";
import { sessionMiddleware } from "./middleware/session";

const app = new Hono<AppBindings>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = new Set([
        c.env.FRONTEND_ORIGIN ?? "https://lubna.pages.dev",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ]);
      if (!origin) return null;
      return allowedOrigins.has(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

app.get("/", (c) => c.json({ ok: true, service: c.env.APP_NAME ?? "Lubna" }));

app.use("*", sessionMiddleware);
app.use("/chat/*", guardrailsMiddleware);

app.route("/auth", authRoutes);
app.route("/chat", chatRoutes);
app.route("/memory", memoryRoutes);
app.route("/user", userRoutes);
app.route("/voice", voiceRoutes);

export default app;
