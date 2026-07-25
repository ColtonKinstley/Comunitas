import { env } from "../env.js";
import type { GeneratedUser } from "./generator.js";
import type { Rng } from "./rng.js";

// Overridable because model names rot faster than hackathon code.
const NOTES_MODEL = process.env.OPENAI_NOTES_MODEL?.trim() || "gpt-4o-mini";

/**
 * One batched chat call writes short first-person notes for ~20% of users so
 * profiles opened during a demo feel human. Best-effort: no key or any
 * failure -> 0 notes, never an error.
 */
export async function addNotes(users: GeneratedUser[], rng: Rng): Promise<number> {
  if (!env.OPENAI_API_KEY) return 0;

  const chosenIdx = rng
    .sample(users.map((_, i) => i), Math.max(1, Math.round(users.length * 0.2)))
    .sort((a, b) => a - b);

  const personas = chosenIdx.map((i) => {
    const u = users[i]!;
    return { i, ageBand: u.ageBand, conditions: u.conditions, goals: u.goals, interests: u.interests, fitnessLevel: u.fitnessLevel };
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: NOTES_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write brief first-person profile notes for fake demo users of a community-health app. " +
              'Return JSON: {"notes": [{"i": <index>, "fitnessNotes": <string|null>, "mobilityNotes": <string|null>}]}. ' +
              "One short sentence each, plain everyday British English, consistent with the persona. " +
              "mobilityNotes only where a condition plausibly affects mobility (arthritis, back_pain, copd, obesity) — else null. " +
              "Vary phrasing across users. No names, no diagnoses beyond what's given.",
          },
          { role: "user", content: JSON.stringify({ personas }) },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      console.warn(`[seed-users] notes pass failed: HTTP ${res.status}`);
      return 0;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as {
      notes?: { i?: number; fitnessNotes?: string | null; mobilityNotes?: string | null }[];
    };
    let added = 0;
    for (const n of parsed.notes ?? []) {
      const u = typeof n.i === "number" ? users[n.i] : undefined;
      if (!u) continue;
      if (n.fitnessNotes) u.fitnessNotes = n.fitnessNotes;
      if (n.mobilityNotes) u.mobilityNotes = n.mobilityNotes;
      if (n.fitnessNotes || n.mobilityNotes) added++;
    }
    return added;
  } catch (err) {
    console.warn("[seed-users] notes pass failed", err);
    return 0;
  }
}
