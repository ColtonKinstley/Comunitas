import { randomBytes } from "node:crypto";
import { count as countFn, eq, isNotNull } from "drizzle-orm";
import { db, tables } from "../db/index.js";
import { generateUsers } from "./generator.js";
import { assignPostcodes } from "./postcodes.js";
import { resolveRegion } from "./region.js";

export interface SeedRunOptions {
  region: string; // place name, postcode, or outcode
  radiusKm?: number; // default 5
  count: number; // 1..1000
  seed?: number | string; // default: the batch id (=> different every run)
  notes?: boolean; // default true; only takes effect when OPENAI_API_KEY set
}

export interface SeedRunResult {
  batchId: string;
  count: number;
  regionLabel: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  postcodesResolved: number;
  notesAdded: number;
}

export function makeBatchId(region: string): string {
  const slug = region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  // Intentionally non-seeded: two runs with the same RNG seed must still get
  // distinct batch ids.
  return `${slug}-${ymd}-${randomBytes(2).toString("hex")}`;
}

export async function runSeed(opts: SeedRunOptions): Promise<SeedRunResult> {
  const radiusKm = opts.radiusKm ?? 5;
  if (!Number.isInteger(opts.count) || opts.count < 1 || opts.count > 1000) {
    throw new Error(`count must be an integer in 1..1000, got ${opts.count}`);
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 50) {
    throw new Error(`radiusKm must be in 0.5..50, got ${radiusKm}`);
  }

  const center = await resolveRegion(opts.region);
  const batchId = makeBatchId(opts.region);
  const users = generateUsers({
    center,
    radiusKm,
    count: opts.count,
    seed: opts.seed ?? batchId,
  });

  const postcodes = await assignPostcodes(users);
  users.forEach((u, i) => {
    u.postcode = postcodes[i] ?? null;
  });
  const postcodesResolved = postcodes.filter((p) => p !== null).length;

  // notes pass added in Task 7
  const notesAdded = 0;

  await db.transaction(async (tx) => {
    for (let offset = 0; offset < users.length; offset += 50) {
      const chunk = users.slice(offset, offset + 50);
      const inserted = await tx
        .insert(tables.patients)
        .values(
          chunk.map((u) => ({
            name: u.name,
            ageBand: u.ageBand,
            postcode: u.postcode,
            lat: u.lat,
            lng: u.lng,
            travelRadiusKm: u.travelRadiusKm,
            transportModes: u.transportModes,
            mobilityNotes: u.mobilityNotes,
            fitnessNotes: u.fitnessNotes,
            confidenceLevel: u.confidenceLevel,
            fitnessLevel: u.fitnessLevel,
            availability: u.availability,
            inductionStatus: "complete" as const,
            seedBatch: batchId,
          })),
        )
        .returning({ id: tables.patients.id });

      const conditionRows = chunk.flatMap((u, i) =>
        u.conditions.map((condition) => ({ patientId: inserted[i]!.id, condition })),
      );
      const goalRows = chunk.flatMap((u, i) =>
        u.goals.map((goal) => ({ patientId: inserted[i]!.id, goal })),
      );
      const interestRows = chunk.flatMap((u, i) =>
        u.interests.map((interest) => ({ patientId: inserted[i]!.id, interest })),
      );
      if (conditionRows.length > 0) await tx.insert(tables.patientConditions).values(conditionRows);
      if (goalRows.length > 0) await tx.insert(tables.patientGoals).values(goalRows);
      if (interestRows.length > 0) await tx.insert(tables.patientInterests).values(interestRows);
    }
  });

  return {
    batchId,
    count: users.length,
    regionLabel: center.label,
    center: { lat: center.lat, lng: center.lng },
    radiusKm,
    postcodesResolved,
    notesAdded,
  };
}

export async function listBatches(): Promise<{ batchId: string; count: number }[]> {
  const rows = await db
    .select({ batchId: tables.patients.seedBatch, count: countFn() })
    .from(tables.patients)
    .where(isNotNull(tables.patients.seedBatch))
    .groupBy(tables.patients.seedBatch)
    .orderBy(tables.patients.seedBatch);
  return rows.map((r) => ({ batchId: r.batchId!, count: r.count }));
}

export async function wipeBatch(batchId: string): Promise<number> {
  // Children cascade via FK.
  const deleted = await db
    .delete(tables.patients)
    .where(eq(tables.patients.seedBatch, batchId))
    .returning({ id: tables.patients.id });
  return deleted.length;
}
