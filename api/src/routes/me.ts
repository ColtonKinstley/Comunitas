import { eq, and, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { patients } from "../db/schema";
import { auth } from "../lib/auth";
import type { MeResponse } from "../types";

export const meRoutes = new Hono();

async function sessionUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
}

async function linkedPatientId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Who am I? Session → auth user → linked patient (null when not yet inducted/claimed). */
meRoutes.get("/", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  if (!user) return c.json<MeResponse>({ user: null, patientId: null });
  return c.json<MeResponse>({
    user: { id: user.id, name: user.name, email: user.email },
    patientId: await linkedPatientId(user.id),
  });
});

/**
 * Attach an unclaimed patient (fresh induction, or a pre-auth localStorage id)
 * to the signed-in user. First-writer-wins: a patient already linked to a
 * different user is a 409, not a steal.
 */
meRoutes.post("/claim", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  if (!user) return c.json({ error: "not signed in" }, 401);
  const { patientId } = await c.req.json<{ patientId?: string }>();
  if (!patientId) return c.json({ error: "patientId required" }, 400);

  const already = await linkedPatientId(user.id);
  if (!already) {
    const updated = await db
      .update(patients)
      .set({ userId: user.id })
      .where(and(eq(patients.id, patientId), isNull(patients.userId)))
      .returning({ id: patients.id });
    if (updated.length === 0) return c.json({ error: "patient not found or already claimed" }, 409);
  }
  return c.json<MeResponse>({
    user: { id: user.id, name: user.name, email: user.email },
    patientId: await linkedPatientId(user.id),
  });
});
