import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";
import { listBatches, runSeed, wipeBatch } from "../seed-users/run.js";

/** Hash both sides so lengths match; constant-time compare on the digests. */
function secretOk(header: string | undefined): boolean {
  if (!env.SEED_SECRET || !header) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(env.SEED_SECRET).digest();
  return timingSafeEqual(a, b);
}

export const adminSeedRoutes = new Hono();

adminSeedRoutes.use("*", async (c, next) => {
  // Unset secret -> pretend the route doesn't exist at all.
  if (!env.SEED_SECRET) throw new HTTPException(404, { message: "not found" });
  if (!secretOk(c.req.header("x-seed-secret"))) {
    throw new HTTPException(401, { message: "invalid seed secret" });
  }
  await next();
});

const seedBody = z.object({
  region: z.string().min(1),
  count: z.number().int().min(1).max(1000),
  radiusKm: z.number().min(0.5).max(50).optional(),
  seed: z.union([z.string(), z.number()]).optional(),
  notes: z.boolean().optional(),
});

adminSeedRoutes.post("/", zValidator("json", seedBody), async (c) => {
  const body = c.req.valid("json");
  try {
    return c.json(await runSeed(body), 201);
  } catch (err) {
    // Region resolution / validation failures are client errors.
    throw new HTTPException(400, { message: err instanceof Error ? err.message : "seed failed" });
  }
});

adminSeedRoutes.get("/", async (c) => c.json({ batches: await listBatches() }));

adminSeedRoutes.delete("/:batchId", async (c) => {
  const deleted = await wipeBatch(c.req.param("batchId"));
  return c.json({ batchId: c.req.param("batchId"), deleted });
});
