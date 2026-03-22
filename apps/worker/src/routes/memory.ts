import { Hono } from "hono";
import type { Context } from "hono";
import type { AppBindings } from "../env";
import { deleteMemoryFact, getMemoryFact, listMemoryFacts, upsertMemoryFact } from "../lib/d1";

function pickKey(c: Context<AppBindings>): string | null {
  const queryKey = c.req.query("key");
  if (queryKey) {
    return queryKey;
  }
  return null;
}

export const memoryRoutes = new Hono<AppBindings>();

memoryRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const key = c.req.query("key");
  if (key) {
    const fact = await getMemoryFact(c.env, user.id, key);
    return c.json({ fact });
  }

  const facts = await listMemoryFacts(c.env, user.id);
  return c.json({ facts });
});

async function updateMemory(c: Context<AppBindings>) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { key?: string; value?: string; confidence?: number } | null;
  if (!body?.key || !body?.value) {
    return c.json({ error: "key and value are required" }, 400);
  }

  const fact = await upsertMemoryFact(c.env, user.id, {
    key: body.key,
    value: body.value,
    confidence: typeof body.confidence === "number" ? body.confidence : undefined,
  });

  return c.json({ fact });
}

memoryRoutes.post("/", updateMemory);
memoryRoutes.post("/update", updateMemory);

memoryRoutes.delete("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const key = pickKey(c) ?? undefined;
  const deleted = await deleteMemoryFact(c.env, user.id, key);
  return c.json({ deleted });
});
