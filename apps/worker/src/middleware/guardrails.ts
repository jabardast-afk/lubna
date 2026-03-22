import type { MiddlewareHandler } from "hono";
import type { AppBindings, CrisisResult } from "../env";
import { CRISIS_RESOURCES } from "@lubna/shared/constants";

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "self harm",
  "hurt myself",
  "end my life",
  "खुद को नुकसान",
  "जीना नहीं चाहती",
  "மரணம்",
  "আত্মহত্যা"
];

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function crisisResponse(): CrisisResult {
  return {
    crisis: true,
    message:
      "I hear you, and I'm so glad you told me. You matter deeply. Please reach out now: India iCall 9152987821, Vandrevala Foundation 1860-2662-345, international befrienders.org.",
    resources: {
      international: CRISIS_RESOURCES.international,
      indiaIcall: CRISIS_RESOURCES.indiaIcall,
      indiaVandrevala: CRISIS_RESOURCES.indiaVandrevala,
    },
  };
}

export const guardrailsMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (c.req.method !== "POST" || !c.req.path.startsWith("/chat/message")) {
    await next();
    return;
  }

  const payload = (await c.req.raw.clone().json().catch(() => null)) as { message?: unknown } | null;
  c.set("parsedBody", payload ?? {});

  const message = typeof payload?.message === "string" ? payload.message : "";
  if (message && detectCrisis(message)) {
    const response = crisisResponse();
    c.set("crisisResult", response);
    return c.json(response, 200);
  }

  await next();
};
