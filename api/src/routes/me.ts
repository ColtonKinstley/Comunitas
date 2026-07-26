import { eq, and, isNull, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { patients } from "../db/schema.js";
import { auth } from "../lib/auth.js";
import { jsonBody } from "../lib/http.js";
import { DEMO_NAME } from "./demo.js";
import type { MeResponse } from "../types.js";

const claimSchema = z
  .object({
    patientId: z.uuid(),
  })
  .strict();

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
meRoutes.post("/claim", jsonBody(claimSchema), async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  if (!user) return c.json({ error: "not signed in" }, 401);
  const { patientId } = c.req.valid("json");

  const already = await linkedPatientId(user.id);
  if (!already) {
    const updated = await db
      .update(patients)
      .set({ userId: user.id })
      .where(
        and(
          eq(patients.id, patientId),
          isNull(patients.userId),
          // The shared demo persona (Priya) must never be permanently bound to a
          // real account — a claim attempt on her falls through to the same 409
          // as "not found or already claimed". `name` is nullable for
          // in-progress inductions, so a null name must still pass through.
          or(isNull(patients.name), ne(patients.name, DEMO_NAME)),
        ),
      )
      .returning({ id: patients.id });
    if (updated.length === 0) return c.json({ error: "patient not found or already claimed" }, 409);
  }
  return c.json<MeResponse>({
    user: { id: user.id, name: user.name, email: user.email },
    patientId: await linkedPatientId(user.id),
  });
});
