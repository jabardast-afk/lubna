import { Hono } from "hono";
import type { Context } from "hono";
import type { ChatMessage } from "@lubna/shared/types";
import type { AppBindings } from "../env";
import { deleteMemoryFact, getMemoryFact, listMemoryFacts, upsertMemoryFact } from "../lib/d1";

interface MemoryFactPayload {
  key: string;
  value: string;
}

function pickKey(c: Context<AppBindings>): string | null {
  const queryKey = c.req.query("key");
  return queryKey || null;
}

function heuristicFacts(messages: ChatMessage[]): MemoryFactPayload[] {
  const joined = messages.map((message) => message.content).join("\n");
  const matches: MemoryFactPayload[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bmy name is\s+([a-z][a-z\s'-]+)/i, "name"],
    [/\bi live in\s+([a-z][a-z\s'-]+)/i, "city"],
    [/\bi work as\s+([a-z][a-z\s'-]+)/i, "job"],
    [/\bi(?:'m| am) feeling\s+([a-z][a-z\s'-]+)/i, "mood"],
    [/\bi decided to\s+([^.!\n]+)/i, "recent decision"]
  ];

  for (const [pattern, key] of patterns) {
    const match = joined.match(pattern);
    if (match?.[1]) {
      matches.push({ key, value: match[1].trim() });
    }
  }

  return matches.slice(0, 5);
}

function parseClaudeFacts(text: string): MemoryFactPayload[] {
  try {
    const parsed = JSON.parse(text) as Array<{ key?: string; value?: string }>;
    return parsed
      .filter((item) => typeof item.key === "string" && typeof item.value === "string")
      .map((item) => ({ key: item.key!.trim(), value: item.value!.trim() }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function extractAndPersistMemories(
  c: Context<AppBindings>,
  userId: string,
  messages: ChatMessage[]
): Promise<MemoryFactPayload[]> {
  const recentMessages = messages.slice(-12);
  if (!recentMessages.length) return [];

  let facts: MemoryFactPayload[] = [];

  if (c.env.ANTHROPIC_API_KEY) {
    const prompt = [
      "Extract 3 to 5 durable user memory facts from this chat.",
      "Only include information about the user, not the assistant.",
      "Return JSON only as an array of objects with key and value fields.",
      "Examples of good facts: user's name, city, job, recent decisions, mood patterns.",
      JSON.stringify(recentMessages)
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (response.ok) {
      const data = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = data.content?.find((item) => item.type === "text")?.text ?? "";
      facts = parseClaudeFacts(text);
    } else {
      console.error("Claude memory extraction failed", await response.text());
    }
  }

  if (!facts.length) {
    facts = heuristicFacts(recentMessages);
  }

  const persisted: MemoryFactPayload[] = [];
  for (const fact of facts.slice(0, 5)) {
    if (!fact.key.trim() || !fact.value.trim()) continue;
    await upsertMemoryFact(c.env, userId, fact);
    persisted.push(fact);
  }

  return persisted;
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

  const body = (await c.req.json().catch(() => null)) as { key?: string; value?: string } | null;
  if (!body?.key || !body?.value) {
    return c.json({ error: "key and value are required" }, 400);
  }

  const fact = await upsertMemoryFact(c.env, user.id, {
    key: body.key,
    value: body.value
  });

  return c.json({ fact });
}

memoryRoutes.post("/", updateMemory);
memoryRoutes.post("/update", updateMemory);

memoryRoutes.post("/extract", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { messages?: ChatMessage[]; limit?: number } | null;
  const limit = Math.max(1, Math.min(20, body?.limit ?? 12));
  const messages = Array.isArray(body?.messages) ? body!.messages.slice(-limit) : [];
  const facts = await extractAndPersistMemories(c, user.id, messages);
  return c.json({ facts });
});

memoryRoutes.delete("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const key = pickKey(c) ?? undefined;
  const deleted = await deleteMemoryFact(c.env, user.id, key);
  return c.json({ deleted });
});
