/**
 * Shared parsing helpers for Discovery pipelines.
 *
 * LLM responses come back as a text blob that we instruct to be JSON. They
 * sometimes arrive with code fences or a preamble anyway — extractJsonObject
 * strips those before JSON.parse, and the caller validates against a Zod
 * schema.
 */

import { LLMResearchResponseSchema } from "./types";
import type { DiscoveryCandidate } from "./types";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseResponse(
  raw: string
): ParseResult<{ candidates: DiscoveryCandidate[] }> {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) return { ok: false, error: "No JSON object found in response" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { ok: false, error: `JSON.parse: ${(err as Error).message}` };
  }
  const validation = LLMResearchResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return { ok: false, error: `Schema: ${validation.error.message}` };
  }
  return { ok: true, value: validation.data };
}

export function extractJsonObject(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenceMatch?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return null;
}
