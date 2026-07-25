import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { inductionSessions } from "../db/schema.js";
import { fail, jsonBody, requireUuid } from "../lib/http.js";
import type { TranscriptEntry, TranscriptResponse } from "../types.js";

const entrySchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  text: z.string().max(8000),
  at: z.string().optional(),
});

const transcriptSchema = z
  .object({
    entries: z.array(entrySchema).min(1).max(100),
    /** Optionally close the session in the same call. */
    status: z.enum(["active", "complete", "abandoned"]).optional(),
  })
  .strict();

export const inductionRoutes = new Hono();

/* --------------------- POST /api/induction/:sessionId/transcript */

inductionRoutes.post("/:sessionId/transcript", jsonBody(transcriptSchema), async (c) => {
  const sessionId = requireUuid(c.req.param("sessionId"), "session id");
  const { entries, status } = c.req.valid("json");

  const [session] = await db
    .select()
    .from(inductionSessions)
    .where(eq(inductionSessions.id, sessionId))
    .limit(1);
  if (!session) fail(404, "induction session not found");

  const stamped: TranscriptEntry[] = entries.map((e) => ({
    role: e.role,
    text: e.text,
    at: e.at ?? new Date().toISOString(),
  }));
  const transcript = [...(session.transcript ?? []), ...stamped];

  await db
    .update(inductionSessions)
    .set({ transcript, ...(status ? { status } : {}) })
    .where(eq(inductionSessions.id, sessionId));

  return c.json<TranscriptResponse>({
    sessionId,
    status: status ?? session.status,
    entryCount: transcript.length,
  });
});

/** Read back a session — useful when debugging the voice flow. */
inductionRoutes.get("/:sessionId", async (c) => {
  const sessionId = requireUuid(c.req.param("sessionId"), "session id");
  const [session] = await db
    .select()
    .from(inductionSessions)
    .where(eq(inductionSessions.id, sessionId))
    .limit(1);
  if (!session) fail(404, "induction session not found");
  return c.json({
    id: session.id,
    patientId: session.patientId,
    status: session.status,
    transcript: session.transcript ?? [],
    createdAt: session.createdAt.toISOString(),
  });
});
