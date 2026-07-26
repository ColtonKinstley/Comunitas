import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { lessonProgress } from "../db/schema.js";
import { fail, jsonBody, requireUuid } from "../lib/http.js";
import { getPatientRow, iso } from "../lib/queries.js";
import type { CompleteLessonResponse, LearnProgressResponse, LessonProgressEntry } from "../types.js";
import type { LessonProgressRow } from "../db/schema.js";

/**
 * Lesson content lives in the web app as static TypeScript; the API only
 * stores progress, keyed by lesson slug. That is why `lessonId` is validated
 * as a slug rather than against a catalogue the server does not have.
 */
const LESSON_ID_RE = /^[a-z0-9-]{1,64}$/;

const completeLessonSchema = z
  .object({
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
  })
  .strict()
  .refine((body) => body.correct <= body.total, { message: "correct must not exceed total" });

const toEntry = (row: LessonProgressRow): LessonProgressEntry => ({
  lessonId: row.lessonId,
  correctCount: row.correctCount,
  totalCount: row.totalCount,
  completedAt: iso(row.completedAt)!,
});

export const learnRoutes = new Hono();

/* ---------------------------------- GET /api/patients/:id/learn */

learnRoutes.get("/:id/learn", async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  const rows = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.patientId, id))
    .orderBy(asc(lessonProgress.completedAt));

  return c.json<LearnProgressResponse>({ progress: rows.map(toEntry) });
});

/* ---------------- POST /api/patients/:id/learn/:lessonId/complete */

learnRoutes.post("/:id/learn/:lessonId/complete", jsonBody(completeLessonSchema), async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const lessonId = c.req.param("lessonId");
  if (!lessonId || !LESSON_ID_RE.test(lessonId)) fail(400, "invalid lesson id");

  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  const { correct, total } = c.req.valid("json");
  const now = new Date();

  // Re-completing a lesson is practice: the stored score just updates.
  const [row] = await db
    .insert(lessonProgress)
    .values({ patientId: id, lessonId, correctCount: correct, totalCount: total, completedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.patientId, lessonProgress.lessonId],
      set: { correctCount: correct, totalCount: total, completedAt: now },
    })
    .returning();

  return c.json<CompleteLessonResponse>(toEntry(row!));
});
