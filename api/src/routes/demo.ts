import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index.js";
import { patients, podMembers } from "../db/schema.js";
import { fail } from "../lib/http.js";
import type { DemoResponse } from "../types.js";

const DEMO_NAME = "Priya Shah";

export const demoRoutes = new Hono();

/**
 * Lets the welcome screen offer "Continue as Priya" without hardcoding a UUID
 * in the client. Falls back to the oldest fully-inducted patient if the seed
 * ever renames the demo persona.
 */
demoRoutes.get("/", async (c) => {
  const [byName] = await db.select().from(patients).where(eq(patients.name, DEMO_NAME)).limit(1);
  const patient =
    byName ??
    (
      await db
        .select()
        .from(patients)
        .where(eq(patients.inductionStatus, "complete"))
        .orderBy(asc(patients.createdAt))
        .limit(1)
    )[0];

  if (!patient) fail(404, "no seeded demo patient — run `bun run db:seed`");

  const [membership] = await db
    .select({ podId: podMembers.podId })
    .from(podMembers)
    .where(eq(podMembers.patientId, patient.id))
    .limit(1);

  return c.json<DemoResponse>({
    patientId: patient.id,
    name: patient.name,
    podId: membership?.podId ?? null,
  });
});
