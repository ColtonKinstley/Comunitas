import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { inductionSessions, patients } from "../db/schema";
import { env } from "../env";
import { fail, jsonBody } from "../lib/http";
import type { RealtimeSessionResponse } from "../types";

/**
 * Voice induction session minting.
 *
 *   POST /api/realtime/session
 *   body:     { patientId?: string }   // resume an in-progress induction
 *   200:      { value, expiresAt, patientId, sessionId }
 *
 * Creates a `patients` row (`induction_status: "in_progress"`) plus an
 * `induction_sessions` row when no `patientId` is supplied, then mints an
 * ephemeral client secret from `POST /v1/realtime/client_secrets` with the
 * interviewer persona and the `update_profile` / `complete_induction` tools
 * baked into the session config. The browser POSTs its SDP offer straight to
 * `https://api.openai.com/v1/realtime/calls` with that secret — the API key
 * never leaves this process.
 */
export const realtimeRoutes = new Hono();

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

/** Spec model. `gpt-realtime` is the fallback if the account can't see 2.1. */
const PRIMARY_MODEL = "gpt-realtime-2.1";
const FALLBACK_MODEL = "gpt-realtime";

/** Secrets expire fast; the client connects immediately. 10 min is plenty of slack. */
const SECRET_TTL_SECONDS = 600;

const bodySchema = z.object({ patientId: z.uuid().optional() }).strict();

/* ------------------------------------------------------- interviewer */

/**
 * Slug vocabularies. The matcher joins on these strings, so the interviewer is
 * told to reuse them where they fit and to coin a snake_case slug otherwise.
 */
const CONDITION_SLUGS =
  "type2_diabetes, prediabetes, hypertension, obesity, high_cholesterol, heart_disease, " +
  "copd, asthma, arthritis, osteoporosis, back_pain, chronic_pain, anxiety, depression, " +
  "long_covid, cancer_recovery, stroke_recovery, insomnia, ibs, menopause";

const GOAL_SLUGS =
  "lose_weight, improve_fitness, reduce_blood_pressure, lower_blood_sugar, social_connection, " +
  "manage_stress, sleep_better, build_strength, improve_balance, more_energy, " +
  "get_outdoors, stop_smoking, drink_less, build_confidence";

const INTEREST_SLUGS =
  "walking, hiking, swimming, gardening, cycling, dancing, yoga, pilates, tai_chi, " +
  "strength_training, running, bowls, tennis, football, crafts, cooking, music, " +
  "photography, birdwatching, volunteering, book_club, art";

const INSTRUCTIONS = `You are the Comunitas health companion — a warm, unhurried voice that welcomes people to Comunitas and gets to know them.

Comunitas connects people to small local groups ("pods") near their home who share their health goals and interests, and who meet up regularly to be active together. Your one job in this conversation is to learn enough about this person to match them with the right pod near them.

## How you speak
- Warm, friendly, human. Like a good neighbour, not a clinician and not a form.
- SHORT turns. One or two sentences, then stop. Never monologue.
- ONE question per turn. Exactly one question mark. Ask it, then stop and wait for the answer. Never stack two questions together, not even a small follow-up like "and how do you get around?".
- NEVER repeat or rephrase a question you have already asked. If they have answered it, however roughly, take the answer and move on to the NEXT topic in the arc.
- Plain everyday language. No jargon, no acronyms, no medical terminology unless they used it first.
- Briefly confirm back what you heard before moving on ("Hackney — lovely."; "Got it, two mornings a week.").
- Many people here are older or not very digitally confident. Be patient, never rush them, never make them feel tested.
- If they go off on a tangent, let them — then gently come back.

## Hard boundaries
- You are NOT a doctor. NEVER give medical advice, a diagnosis, a treatment suggestion, medication guidance, or an opinion on whether an activity is safe for them.
- If they ask for any of that, say kindly that you're not able to advise on health matters and they should speak to their GP or care team — then carry on with the conversation.
- Don't ask for medical detail you don't need (no test results, no medication lists, no dosages). You only need enough to find them the right group.
- Never promise clinical outcomes.

## Opening
Open immediately, without waiting to be prompted. Something like: "Hello, and welcome to Comunitas. I'm here to have a quick chat so we can find you a friendly local group. It'll only take a few minutes. Can I start with your name?"

## The arc (follow this order, but stay conversational)
1. **Name** — what should we call you?
2. **Where they live** — the area, and their postcode so we can find groups nearby. Ask for the postcode plainly ("what's your postcode?"). Then: how far are they happy to travel (in minutes or miles/km — convert to a sensible radius in km), and how they usually get around (walking, cycling, bus, tube, car).
3. **Age group** — ask gently and in plain words, offering the bands so they never have to give an exact age: "And roughly which age group are you in — under thirty, thirties to mid-forties, mid-forties to late fifties, sixties to early seventies, or seventy-five and over?" Take whatever they give you (an age, a decade, "I'm seventy-eight") and map it yourself to one of: 18-29, 30-44, 45-59, 60-74, 75+. It helps us put them with people at a similar stage. If they'd rather not say, that's completely fine — say so warmly and move on.
4. **What brought them to Comunitas** — open question. Let health conditions surface naturally in their answer; if they mention a condition, acknowledge it warmly and move on. If nothing surfaces, ask gently whether there's anything about their health they're working on or that a doctor has mentioned.
5. **Goals** — what would they like to be different in six months?
6. **Current activity & fitness** — what do they do at the moment? Then place them 1–5 (1 = barely active at all, 5 = very active and exercising regularly). Don't read the scale out like a survey — judge it from what they say, or ask a soft version ("would you say you're just starting out, or fairly active already?").
7. **Interests** — what do they actually enjoy, or what have they always fancied trying?
8. **Availability** — which days of the week work, and roughly what time of day (morning, afternoon, evening).
9. **Constraints & confidence** — anything about getting about, pain, or mobility the group should know? And how confident do they feel about joining a new group of strangers, 1–5 (1 = quite nervous, 5 = can't wait)? Again, infer it kindly rather than reading out a scale.
10. **Recap** — read back a short warm summary of what you've learned. Ask if you've got it right and if there's anything they'd like to change.
11. **Finish** — tell them you're finding their group now, then call complete_induction.

## Using your tools
- Call \`update_profile\` **the moment you learn something** — do not wait for the end, do not batch it up. After they say their name, call it with the name. After they give a postcode, call it with the postcode. And so on. Each call can carry just the one or two fields you just learned.
- \`conditions\`, \`goals\` and \`interests\` REPLACE the whole list each time, so always send the complete list you know so far, not just the new item.
- Prefer these slugs where one fits, otherwise coin your own lower_snake_case slug:
  - conditions: ${CONDITION_SLUGS}
  - goals: ${GOAL_SLUGS}
  - interests: ${INTEREST_SLUGS}
- Put their own words in the \`note\` field ("says it flares up in cold weather"). Keep notes short.
- Never mention the tools, the profile, "saving", "the system", or any of this machinery out loud. It happens silently while you talk.
- NEVER narrate tool use. No "let me note that down", "just popping that in", "one moment", "give me a second" — no filler of any kind. Call \`update_profile\` silently and carry straight on speaking in the same turn, as if nothing happened.
- After a tool result comes back, do NOT re-ask or re-confirm what you just saved. Move to the NEXT topic in the arc and ask the next single question.

## Before you finish
Only call \`complete_induction\` once ALL of these are true:
- location: postcode captured, plus travel radius and transport
- an age band (or you have asked and they preferred not to say)
- at least one condition (or you've clearly asked and they genuinely have none — then send an empty list)
- at least one goal
- a fitness level 1–5
- at least one interest
- availability for at least one day
- you have asked about mobility/constraints and formed a view on confidence
- you have given them the spoken recap and they were happy with it

If something is still missing, ask for it — don't finish early. After you call complete_induction, say one short warm closing line ("Wonderful — I've found a group for you, let's take a look.") and then stop talking.`;

const availabilityDay = {
  type: "array",
  items: { type: "string", enum: ["morning", "afternoon", "evening"] },
} as const;

const tagArray = (what: string) => ({
  type: "array",
  description: `${what} Send the COMPLETE list every time — it replaces what was stored before.`,
  items: {
    type: "object",
    properties: {
      slug: { type: "string", description: "lower_snake_case slug, e.g. type2_diabetes" },
      note: { type: "string", description: "Optional short note in the person's own words." },
    },
    required: ["slug"],
    additionalProperties: false,
  },
});

/** Mirrors the `PATCH /api/patients/:id/profile` body exactly. All fields optional. */
const UPDATE_PROFILE_TOOL = {
  type: "function",
  name: "update_profile",
  description:
    "Save what you have just learned about the person. Call this immediately after learning " +
    "any field — never wait until the end of the conversation. Send only the fields you just " +
    "learned; everything is optional and this is a partial update.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "What they'd like to be called." },
      ageBand: {
        type: "string",
        enum: ["18-29", "30-44", "45-59", "60-74", "75+"],
        description:
          "Which age group they are in. Map whatever they say (an age, a decade, 'my seventies') " +
          "onto the nearest band. Leave unset if they'd rather not say.",
      },
      postcode: { type: "string", description: "UK postcode, e.g. 'E9 6HB'." },
      travelRadiusKm: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "How far they are willing to travel to a group, in kilometres.",
      },
      transportModes: {
        type: "array",
        items: { type: "string", enum: ["walk", "cycle", "bus", "tube", "car"] },
        description: "How they usually get around.",
      },
      mobilityNotes: {
        type: "string",
        description:
          "Anything about mobility, pain, stamina or access a group leader should know. Their words.",
      },
      confidenceLevel: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Confidence about joining a new group: 1 very nervous … 5 can't wait.",
      },
      fitnessLevel: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Current activity level: 1 barely active … 5 very active.",
      },
      fitnessNotes: {
        type: "string",
        description: "Short note on what they currently do for activity.",
      },
      availability: {
        type: "object",
        description:
          "Which parts of which days they're free. Send the whole week you know about each time.",
        properties: {
          mon: availabilityDay,
          tue: availabilityDay,
          wed: availabilityDay,
          thu: availabilityDay,
          fri: availabilityDay,
          sat: availabilityDay,
          sun: availabilityDay,
        },
        additionalProperties: false,
      },
      conditions: tagArray("Health conditions they have mentioned."),
      goals: tagArray("What they want to achieve."),
      interests: tagArray("Activities they enjoy or would like to try."),
    },
    additionalProperties: false,
  },
} as const;

const COMPLETE_INDUCTION_TOOL = {
  type: "function",
  name: "complete_induction",
  description:
    "Finish the induction and match them to a local pod. Only call this once every item on " +
    "the coverage checklist is captured and you have given them the spoken recap.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
} as const;

const sessionConfig = (model: string) => ({
  expires_after: { anchor: "created_at", seconds: SECRET_TTL_SECONDS },
  session: {
    type: "realtime",
    model,
    instructions: INSTRUCTIONS,
    tools: [UPDATE_PROFILE_TOOL, COMPLETE_INDUCTION_TOOL],
    tool_choice: "auto",
    audio: {
      input: {
        transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
        // Semantic VAD waits for a *complete thought* rather than a silence
        // threshold — older speakers pause mid-sentence and server_vad
        // interrupts them.
        turn_detection: { type: "semantic_vad" },
      },
      output: { voice: "marin" },
    },
  },
});

interface ClientSecret {
  value: string;
  expiresAt: number;
}

/** Both the flat (`{value, expires_at}`) and nested (`{client_secret:{…}}`) shapes. */
function readSecret(payload: unknown): ClientSecret | null {
  const body = payload as
    | { value?: string; expires_at?: number; client_secret?: { value?: string; expires_at?: number } }
    | null;
  const value = body?.value ?? body?.client_secret?.value;
  if (typeof value !== "string" || value.length === 0) return null;
  const expiresAt = body?.expires_at ?? body?.client_secret?.expires_at;
  return {
    value,
    expiresAt:
      typeof expiresAt === "number"
        ? expiresAt
        : Math.floor(Date.now() / 1000) + SECRET_TTL_SECONDS,
  };
}

async function mintSecret(model: string) {
  const res = await fetch(CLIENT_SECRETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionConfig(model)),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

/* ----------------------------------------- POST /api/realtime/session */

realtimeRoutes.post("/session", jsonBody(bodySchema), async (c) => {
  if (!env.OPENAI_API_KEY) {
    fail(501, "OPENAI_API_KEY is not set on the API server — the voice induction cannot start");
  }

  const { patientId: resumeId } = c.req.valid("json");

  // Resolve the patient + session rows first: a failed OpenAI call should not
  // leave orphan rows behind, and a resumed induction must reuse its session so
  // the transcript stays in one place.
  let patientId: string;
  let sessionId: string;

  if (resumeId) {
    const [existing] = await db.select().from(patients).where(eq(patients.id, resumeId)).limit(1);
    if (!existing) fail(404, "patient not found");
    patientId = existing.id;

    if (existing.inductionStatus !== "in_progress") {
      await db
        .update(patients)
        .set({ inductionStatus: "in_progress" })
        .where(eq(patients.id, patientId));
    }

    const [active] = await db
      .select()
      .from(inductionSessions)
      .where(
        and(
          eq(inductionSessions.patientId, patientId),
          eq(inductionSessions.status, "active"),
        ),
      )
      .orderBy(desc(inductionSessions.createdAt))
      .limit(1);

    if (active) {
      sessionId = active.id;
    } else {
      const [created] = await db
        .insert(inductionSessions)
        .values({ patientId })
        .returning({ id: inductionSessions.id });
      sessionId = created!.id;
    }
  } else {
    const [patient] = await db
      .insert(patients)
      .values({ inductionStatus: "in_progress" })
      .returning({ id: patients.id });
    patientId = patient!.id;

    const [created] = await db
      .insert(inductionSessions)
      .values({ patientId })
      .returning({ id: inductionSessions.id });
    sessionId = created!.id;
  }

  let model = PRIMARY_MODEL;
  let result = await mintSecret(model);

  // Some accounts don't see the dated model yet — fall back rather than dying.
  if (!result.ok && /model/i.test(result.text)) {
    console.warn(`[realtime] ${PRIMARY_MODEL} rejected (${result.status}), retrying ${FALLBACK_MODEL}`);
    model = FALLBACK_MODEL;
    result = await mintSecret(model);
  }

  if (!result.ok) {
    console.error(`[realtime] client_secrets failed ${result.status}: ${result.text.slice(0, 500)}`);
    fail(500, `Could not start a voice session (OpenAI returned ${result.status})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    fail(500, "Could not start a voice session (unreadable response from OpenAI)");
  }

  const secret = readSecret(parsed);
  if (!secret) {
    console.error(`[realtime] no client secret in response: ${result.text.slice(0, 500)}`);
    fail(500, "Could not start a voice session (no client secret returned)");
  }

  console.log(`[realtime] session ${sessionId} minted for patient ${patientId} on ${model}`);

  return c.json<RealtimeSessionResponse>({
    value: secret.value,
    expiresAt: secret.expiresAt,
    patientId,
    sessionId,
  });
});
