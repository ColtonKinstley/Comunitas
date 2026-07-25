# Random User Seeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed hundreds of realistic fake patients into any geographic region (place name or UK postcode + radius), via a CLI for local dev and a secret-protected HTTP endpoint for the deployed API, with per-run batch tagging and wipe.

**Architecture:** One pure, deterministic generator module (`api/src/seed-users/`) shared by two thin wrappers — a Bun CLI (`api/src/db/seed-users.ts`) and Hono admin routes (`api/src/routes/admin-seed.ts`). Region → centroid via postcodes.io (postcodes/outcodes) or Nominatim (place names); sampled coordinates get real postcodes via postcodes.io bulk reverse-geocode; an optional single batched OpenAI call adds free-text notes to ~20% of users.

**Tech Stack:** Bun, TypeScript, Hono, Drizzle ORM + `postgres` driver, Zod v4 (`@hono/zod-validator`), `bun test` for the pure modules. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-07-25-random-user-seeder-design.md`

## Global Constraints

- Work in the current worktree; commit after every task; never push to main.
- No new npm packages. Use `fetch`, `node:util` `parseArgs`, `node:crypto`.
- The generator must be **pure and deterministic**: all randomness through the seeded RNG in `rng.ts`; `Math.random()` is forbidden in `api/src/seed-users/` (batch-id suffix is the one exception, see Task 6).
- Slugs must come from the vocabularies in `web/src/features/profile/vocab.ts` (conditions/goals/interests/transport). Do not invent new slugs.
- Check `api/src/types.ts` for the exact `AgeBand`, `Availability`, `TransportMode`, `InductionStatus` unions and import them — do not redeclare.
- External calls: postcodes.io (keyless), Nominatim with header `User-Agent: comunitas-seeder/1.0 (hackathon demo)` (their usage policy requires it), OpenAI only when `OPENAI_API_KEY` is set.
- Every external failure except "region not found" degrades gracefully (warning + continue). Region not found aborts with a clear error before any DB write.
- Run `bun run typecheck` (repo root) and `cd api && bun test` before each commit.
- Match existing code style: ESM imports with `.js` suffixes, comment sparsely and only for constraints (see existing files).

---

### Task 1: `seed_batch` column on patients

**Files:**
- Modify: `api/src/db/schema.ts` (patients table, ~line 33-50)
- Modify: `api/package.json` (add `"test": "bun test"` script)

**Interfaces:**
- Produces: `patients.seedBatch` (nullable text column `seed_batch`, indexed) — all later tasks rely on this exact property name.

- [ ] **Step 1: Add the column and index**

In `api/src/db/schema.ts`, add to the `patients` table after `inductionStatus`:

```ts
  // Set only on generated demo users; wipe = DELETE WHERE seed_batch = $1.
  seedBatch: text("seed_batch"),
```

and convert the table to the third-argument form used by `patientConditions` to add the index:

```ts
export const patients = pgTable(
  "patients",
  {
    /* ...existing columns unchanged... */
  },
  (t) => [index("patients_seed_batch_idx").on(t.seedBatch)],
);
```

- [ ] **Step 2: Add the test script**

In `api/package.json` scripts: `"test": "bun test"`.

- [ ] **Step 3: Push and verify**

Run: `bun run typecheck` then `bun run db:push` (repo root; local Postgres must be up).
Expected: typecheck clean; push reports adding `seed_batch` + index, nothing else.

- [ ] **Step 4: Commit**

```bash
git add api/src/db/schema.ts api/package.json
git commit -m "feat(api): add patients.seed_batch column for tagged demo seeding"
```

---

### Task 2: Seeded RNG + geo sampling (`rng.ts`)

**Files:**
- Create: `api/src/seed-users/rng.ts`
- Test: `api/src/seed-users/rng.test.ts`

**Interfaces:**
- Produces:
  - `class Rng { constructor(seed: number | string); next(): number; int(min: number, max: number): number; chance(p: number): boolean; pick<T>(arr: readonly T[]): T; weighted<T>(items: readonly (readonly [T, number])[]): T; sample<T>(arr: readonly T[], n: number): T[]; gaussian(mean: number, sd: number): number }`
  - `sampleCoords(rng: Rng, center: { lat: number; lng: number }, radiusKm: number, count: number): { lat: number; lng: number }[]`

- [ ] **Step 1: Write failing tests**

`api/src/seed-users/rng.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Rng, sampleCoords } from "./rng.js";

describe("Rng", () => {
  test("same seed reproduces the same sequence", () => {
    const a = new Rng("hackney-42");
    const b = new Rng("hackney-42");
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  test("different seeds diverge", () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  test("int stays in bounds inclusive", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  test("weighted respects zero weights", () => {
    const rng = new Rng(9);
    for (let i = 0; i < 200; i++) {
      expect(rng.weighted([["a", 0], ["b", 1]] as const)).toBe("b");
    }
  });

  test("sample returns n distinct elements", () => {
    const rng = new Rng(3);
    const s = rng.sample([1, 2, 3, 4, 5], 3);
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});

describe("sampleCoords", () => {
  test("all points fall inside the radius", () => {
    const rng = new Rng("geo");
    const center = { lat: 51.545, lng: -0.055 }; // Hackney
    const pts = sampleCoords(rng, center, 3, 300);
    expect(pts).toHaveLength(300);
    for (const p of pts) {
      const dLat = (p.lat - center.lat) * 110.574;
      const dLng = (p.lng - center.lng) * 111.32 * Math.cos((center.lat * Math.PI) / 180);
      expect(Math.hypot(dLat, dLng)).toBeLessThanOrEqual(3.0001);
    }
  });

  test("points cluster rather than spread uniformly", () => {
    // With clustering, mean pairwise distance is well below the uniform-disk
    // expectation (~0.9054 * r). Guards against regressing to uniform dust.
    const rng = new Rng("cluster-check");
    const pts = sampleCoords(rng, { lat: 51.5, lng: -0.1 }, 4, 200);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < pts.length; i += 5) {
      for (let j = i + 5; j < pts.length; j += 5) {
        const dLat = (pts[i]!.lat - pts[j]!.lat) * 110.574;
        const dLng = (pts[i]!.lng - pts[j]!.lng) * 111.32 * Math.cos((51.5 * Math.PI) / 180);
        sum += Math.hypot(dLat, dLng);
        n++;
      }
    }
    expect(sum / n).toBeLessThan(0.85 * 4);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd api && bun test seed-users/rng`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`api/src/seed-users/rng.ts`:

```ts
/** FNV-1a: string seed -> uint32, so "hackney-42" style seeds are stable. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, fast, good-enough PRNG; determinism is the point. */
export class Rng {
  private state: number;

  constructor(seed: number | string) {
    this.state = (typeof seed === "string" ? hashSeed(seed) : seed >>> 0) || 1;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [value, w] of items) {
      r -= w;
      if (r < 0) return value;
    }
    return items[items.length - 1]![0];
  }

  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  gaussian(mean: number, sd: number): number {
    // Box-Muller; guard against log(0).
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

const KM_PER_DEG_LAT = 110.574;

/**
 * Sample points inside the radius with 2-4 gaussian sub-clusters — people
 * bunch around high streets and estates; a uniform disk looks fake on the map.
 */
export function sampleCoords(
  rng: Rng,
  center: { lat: number; lng: number },
  radiusKm: number,
  count: number,
): { lat: number; lng: number }[] {
  const kmPerDegLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const clusterCount = rng.int(2, 4);
  const clusters: { x: number; y: number; weight: number }[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const r = radiusKm * 0.6 * Math.sqrt(rng.next());
    const theta = rng.next() * 2 * Math.PI;
    clusters.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), weight: 1 + rng.next() * 2 });
  }

  const points: { lat: number; lng: number }[] = [];
  while (points.length < count) {
    const c = rng.weighted(clusters.map((cl) => [cl, cl.weight] as const));
    const x = c.x + rng.gaussian(0, radiusKm / 4);
    const y = c.y + rng.gaussian(0, radiusKm / 4);
    if (Math.hypot(x, y) > radiusKm) continue; // resample outside the radius
    points.push({ lat: center.lat + y / KM_PER_DEG_LAT, lng: center.lng + x / kmPerDegLng });
  }
  return points;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd api && bun test seed-users/rng`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/seed-users/rng.ts api/src/seed-users/rng.test.ts
git commit -m "feat(api): seeded PRNG and clustered coordinate sampling for user seeder"
```

---

### Task 3: Persona data tables (`data.ts`)

**Files:**
- Create: `api/src/seed-users/data.ts`

**Interfaces:**
- Consumes: type `AgeBand`, `TransportMode`, `TimeSlot`, `DayKey` from `../types.js` (verify exact names there first).
- Produces (consumed by Task 4's generator):
  - `FIRST_NAMES: { name: string; bands: AgeBand[] }[]` (≥60 entries)
  - `SURNAMES: string[]` (≥50 entries)
  - `AGE_BAND_WEIGHTS: [AgeBand, number][]`
  - `CONDITION_WEIGHTS_BY_BAND: Record<AgeBand, [string, number][]>` (condition slugs)
  - `GOAL_AFFINITY: Record<string, string[]>` (condition slug → goal slugs)
  - `INTEREST_AFFINITY: Record<string, string[]>` (goal slug → interest slugs)
  - `GOAL_SLUGS: string[]`, `INTEREST_SLUGS: string[]` (copies of the client vocab)
  - `TRANSPORT_PROFILES: { modes: TransportMode[]; radius: [number, number]; weight: number }[]`
  - `AVAILABILITY_ARCHETYPES: { weight: number; bands: AgeBand[]; days: Partial<Record<DayKey, TimeSlot[]>> }[]`

- [ ] **Step 1: Write the module**

Copy the slug lists from `web/src/features/profile/vocab.ts` verbatim (conditions: `type2_diabetes, hypertension, obesity, anxiety, arthritis, high_cholesterol, copd, back_pain`; goals: `lose_weight, improve_fitness, reduce_blood_pressure, social_connection, manage_stress, better_sleep, build_strength`; interests: `walking, swimming, gardening, cycling, dancing, yoga, crafts, tai_chi, birdwatching`).

Names must reflect London's mix. Use these pools (extend freely, same spirit):

```ts
// bands = age bands where the first name is plausible; generation-skewed
// (Margaret peaks 75+, Jayden peaks 18-29) without being absolute.
export const FIRST_NAMES: { name: string; bands: AgeBand[] }[] = [
  // skew older
  { name: "Margaret", bands: ["60-74", "75+"] },
  { name: "Brian", bands: ["60-74", "75+"] },
  { name: "Doreen", bands: ["60-74", "75+"] },
  { name: "Derek", bands: ["60-74", "75+"] },
  { name: "Sylvia", bands: ["60-74", "75+"] },
  { name: "Ronald", bands: ["60-74", "75+"] },
  { name: "Patricia", bands: ["45-59", "60-74", "75+"] },
  { name: "Terence", bands: ["60-74", "75+"] },
  { name: "Beverley", bands: ["45-59", "60-74"] },
  { name: "Winston", bands: ["60-74", "75+"] },
  { name: "Cynthia", bands: ["60-74", "75+"] },
  { name: "Leonard", bands: ["60-74", "75+"] },
  // middle
  { name: "Sarah", bands: ["30-44", "45-59"] },
  { name: "David", bands: ["45-59", "60-74"] },
  { name: "Priya", bands: ["30-44", "45-59"] },
  { name: "Mohammed", bands: ["18-29", "30-44", "45-59"] },
  { name: "Fatima", bands: ["30-44", "45-59"] },
  { name: "Kwame", bands: ["30-44", "45-59"] },
  { name: "Aisha", bands: ["18-29", "30-44"] },
  { name: "Rajesh", bands: ["45-59", "60-74"] },
  { name: "Wei", bands: ["30-44", "45-59"] },
  { name: "Tunde", bands: ["30-44", "45-59"] },
  { name: "Zainab", bands: ["18-29", "30-44"] },
  { name: "Marek", bands: ["30-44", "45-59"] },
  { name: "Agnieszka", bands: ["30-44", "45-59"] },
  { name: "Sofia", bands: ["18-29", "30-44"] },
  { name: "Emma", bands: ["30-44", "45-59"] },
  { name: "James", bands: ["30-44", "45-59", "60-74"] },
  { name: "Nadia", bands: ["30-44", "45-59"] },
  { name: "Carlos", bands: ["30-44", "45-59"] },
  { name: "Yusuf", bands: ["18-29", "30-44"] },
  { name: "Grace", bands: ["18-29", "60-74", "75+"] },
  { name: "Devon", bands: ["30-44", "45-59"] },
  { name: "Mei", bands: ["30-44", "45-59"] },
  { name: "Ade", bands: ["30-44", "45-59"] },
  { name: "Kemi", bands: ["30-44", "45-59"] },
  { name: "Hasan", bands: ["45-59", "60-74"] },
  { name: "Lena", bands: ["30-44", "45-59"] },
  { name: "Paulo", bands: ["30-44", "45-59"] },
  { name: "Anika", bands: ["18-29", "30-44"] },
  // skew younger
  { name: "Jayden", bands: ["18-29", "30-44"] },
  { name: "Chloe", bands: ["18-29", "30-44"] },
  { name: "Tyler", bands: ["18-29", "30-44"] },
  { name: "Amara", bands: ["18-29", "30-44"] },
  { name: "Kai", bands: ["18-29", "30-44"] },
  { name: "Maya", bands: ["18-29", "30-44"] },
  { name: "Leon", bands: ["18-29", "30-44"] },
  { name: "Yasmin", bands: ["18-29", "30-44"] },
  { name: "Ethan", bands: ["18-29"] },
  { name: "Zara", bands: ["18-29", "30-44"] },
  { name: "Dylan", bands: ["18-29", "30-44"] },
  { name: "Freya", bands: ["18-29", "30-44"] },
  { name: "Omar", bands: ["18-29", "30-44"] },
  { name: "Nia", bands: ["18-29", "30-44"] },
  { name: "Callum", bands: ["18-29", "30-44"] },
  { name: "Isla", bands: ["18-29"] },
  { name: "Reece", bands: ["18-29", "30-44"] },
  { name: "Tanya", bands: ["30-44", "45-59"] },
  { name: "Bilal", bands: ["18-29", "30-44"] },
  { name: "Shanice", bands: ["18-29", "30-44"] },
];

export const SURNAMES: string[] = [
  "Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Wilson", "Evans",
  "Patel", "Khan", "Begum", "Ahmed", "Ali", "Hussain", "Shah", "Chowdhury",
  "Okafor", "Adeyemi", "Mensah", "Osei", "Campbell", "Thomas", "Roberts",
  "Chen", "Wong", "Li", "Zhang", "Nguyen", "Kim", "Singh", "Kaur", "Sharma",
  "Kowalski", "Nowak", "Silva", "Santos", "Fernandes", "Costa", "Murphy",
  "O'Brien", "Kelly", "Byrne", "Walsh", "Johnson", "White", "Green", "Hall",
  "Clarke", "Lewis", "Baker", "Mitchell", "Barnes", "Osman",
];
```

Weights and affinities (exact values to use):

```ts
export const AGE_BAND_WEIGHTS: [AgeBand, number][] = [
  ["18-29", 8], ["30-44", 20], ["45-59", 30], ["60-74", 30], ["75+", 12],
];

export const CONDITION_WEIGHTS_BY_BAND: Record<AgeBand, [string, number][]> = {
  "18-29": [["anxiety", 30], ["obesity", 15], ["back_pain", 10], ["type2_diabetes", 4], ["hypertension", 3], ["high_cholesterol", 2], ["arthritis", 1], ["copd", 1]],
  "30-44": [["anxiety", 25], ["obesity", 20], ["back_pain", 15], ["type2_diabetes", 10], ["hypertension", 10], ["high_cholesterol", 8], ["arthritis", 3], ["copd", 2]],
  "45-59": [["hypertension", 22], ["type2_diabetes", 18], ["obesity", 16], ["back_pain", 14], ["high_cholesterol", 14], ["anxiety", 10], ["arthritis", 8], ["copd", 4]],
  "60-74": [["hypertension", 25], ["arthritis", 20], ["type2_diabetes", 18], ["high_cholesterol", 15], ["back_pain", 10], ["copd", 8], ["obesity", 8], ["anxiety", 6]],
  "75+":   [["arthritis", 28], ["hypertension", 25], ["high_cholesterol", 14], ["type2_diabetes", 12], ["copd", 10], ["back_pain", 8], ["anxiety", 5], ["obesity", 4]],
};

// condition -> goals that plausibly follow from it
export const GOAL_AFFINITY: Record<string, string[]> = {
  type2_diabetes: ["lose_weight", "improve_fitness"],
  hypertension: ["reduce_blood_pressure", "manage_stress", "improve_fitness"],
  obesity: ["lose_weight", "improve_fitness", "build_strength"],
  anxiety: ["manage_stress", "better_sleep", "social_connection"],
  arthritis: ["build_strength", "improve_fitness"],
  high_cholesterol: ["lose_weight", "improve_fitness"],
  copd: ["improve_fitness", "better_sleep"],
  back_pain: ["build_strength", "improve_fitness"],
};

// goal -> interests that serve it
export const INTEREST_AFFINITY: Record<string, string[]> = {
  lose_weight: ["walking", "swimming", "cycling", "dancing"],
  improve_fitness: ["walking", "cycling", "swimming", "dancing"],
  reduce_blood_pressure: ["walking", "tai_chi", "gardening", "swimming"],
  social_connection: ["crafts", "gardening", "dancing", "birdwatching", "walking"],
  manage_stress: ["yoga", "tai_chi", "gardening", "birdwatching"],
  better_sleep: ["yoga", "walking", "tai_chi"],
  build_strength: ["yoga", "swimming", "cycling", "dancing"],
};

export const TRANSPORT_PROFILES: { modes: TransportMode[]; radius: [number, number]; weight: number }[] = [
  { modes: ["walk"], radius: [1, 3], weight: 25 },
  { modes: ["walk", "bus"], radius: [2, 5], weight: 30 },
  { modes: ["walk", "tube", "bus"], radius: [3, 8], weight: 20 },
  { modes: ["cycle", "walk"], radius: [3, 8], weight: 10 },
  { modes: ["car"], radius: [5, 15], weight: 15 },
];

export const AVAILABILITY_ARCHETYPES: { weight: number; bands: AgeBand[]; days: Partial<Record<DayKey, TimeSlot[]>> }[] = [
  // 9-to-5 worker: evenings + weekend
  { weight: 30, bands: ["18-29", "30-44", "45-59"], days: { mon: ["evening"], wed: ["evening"], thu: ["evening"], sat: ["morning", "afternoon"], sun: ["morning"] } },
  // shift worker: scattered
  { weight: 10, bands: ["18-29", "30-44", "45-59"], days: { tue: ["morning"], thu: ["afternoon"], sun: ["afternoon", "evening"] } },
  // part-time / carer: weekday mid-days
  { weight: 15, bands: ["30-44", "45-59", "60-74"], days: { mon: ["morning"], tue: ["morning", "afternoon"], thu: ["morning"], fri: ["afternoon"] } },
  // retired: weekday mornings/afternoons
  { weight: 35, bands: ["60-74", "75+"], days: { mon: ["morning", "afternoon"], tue: ["morning"], wed: ["morning", "afternoon"], thu: ["morning"], fri: ["morning", "afternoon"] } },
  // weekend-only
  { weight: 10, bands: ["18-29", "30-44", "45-59", "60-74"], days: { sat: ["morning", "afternoon", "evening"], sun: ["morning", "afternoon"] } },
];
```

Also export `GOAL_SLUGS` and `INTEREST_SLUGS` arrays (verbatim client vocab) for noise sampling.

- [ ] **Step 2: Typecheck and commit**

Run: `bun run typecheck` — expected clean (import types from `../types.js`; if `DayKey`/`TimeSlot` don't exist there, they're in `Availability`'s definition — reuse whatever `api/src/types.ts` actually names them).

```bash
git add api/src/seed-users/data.ts
git commit -m "feat(api): persona data tables for user seeder"
```

---

### Task 4: Pure generator (`generator.ts`)

**Files:**
- Create: `api/src/seed-users/generator.ts`
- Test: `api/src/seed-users/generator.test.ts`

**Interfaces:**
- Consumes: `Rng`, `sampleCoords` (Task 2); all tables from `data.ts` (Task 3); types from `../types.js`.
- Produces:

```ts
export interface GeneratedUser {
  name: string;
  ageBand: AgeBand;
  lat: number;
  lng: number;
  postcode: string | null;       // filled by Task 5b, null here
  travelRadiusKm: number;
  transportModes: TransportMode[];
  confidenceLevel: number;       // 1-5
  fitnessLevel: number;          // 1-5
  availability: Availability;
  conditions: string[];          // 0-3 slugs
  goals: string[];               // 1-3 slugs
  interests: string[];           // 2-4 slugs
  mobilityNotes: string | null;  // filled by Task 7, null here
  fitnessNotes: string | null;
}

export function generateUsers(opts: {
  center: { lat: number; lng: number };
  radiusKm: number;
  count: number;
  seed: number | string;
}): GeneratedUser[]
```

Generation rules (implement exactly):
1. `ageBand = rng.weighted(AGE_BAND_WEIGHTS)`.
2. Name: filter `FIRST_NAMES` to entries whose `bands` include the age band, `rng.pick` one; surname `rng.pick(SURNAMES)`; full name `"First Last"`.
3. Conditions: count via `rng.weighted([[0, 15], [1, 40], [2, 30], [3, 15]])`; draw without replacement from `CONDITION_WEIGHTS_BY_BAND[ageBand]` (re-draw on duplicate slug).
4. Goals: union of `GOAL_AFFINITY[c]` for each condition; if empty (no conditions) use all `GOAL_SLUGS`. `rng.sample` 1-3 from that pool; then with 20% chance (`rng.chance(0.2)`) swap one for a random goal from `GOAL_SLUGS` not already chosen — noise so users aren't stereotypes.
5. Interests: union of `INTEREST_AFFINITY[g]` for each goal; `rng.sample` 2-4; 25% chance add one random extra interest from `INTEREST_SLUGS` (skip if already at 4 or duplicate).
6. Transport: `rng.weighted` over `TRANSPORT_PROFILES` (by `weight`); `travelRadiusKm = rng.int(...profile.radius)`. For bands `60-74`/`75+`, cap `travelRadiusKm` at 8.
7. Fitness: base by band (`18-29`: 3.4, `30-44`: 3.2, `45-59`: 2.8, `60-74`: 2.4, `75+`: 2.0), minus `0.4 * conditions.length`, plus `rng.gaussian(0, 0.7)`, rounded and clamped 1-5. Confidence: `fitnessLevel + rng.int(-1, 1)` clamped 1-5.
8. Availability: `rng.weighted` over archetypes filtered to the user's band (fall back to all archetypes if none match); then jitter — with 30% chance drop one day, with 30% chance add `["morning"]` to one missing weekday. Build a full `Availability` object (check `api/src/types.ts` for whether absent days are omitted keys or empty arrays — mirror what `api/src/db/seed.ts` does).
9. Coordinates from `sampleCoords(rng, center, radiusKm, count)`, one per user in order.
10. `postcode`, `mobilityNotes`, `fitnessNotes` are `null` at this stage.

- [ ] **Step 1: Write failing tests**

`api/src/seed-users/generator.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { generateUsers } from "./generator.js";
import { CONDITION_WEIGHTS_BY_BAND, GOAL_SLUGS, INTEREST_SLUGS } from "./data.js";

const OPTS = { center: { lat: 51.545, lng: -0.055 }, radiusKm: 3, count: 250, seed: "test-1" };
const CONDITION_SLUGS = CONDITION_WEIGHTS_BY_BAND["45-59"].map(([slug]) => slug);

describe("generateUsers", () => {
  test("deterministic for the same seed", () => {
    expect(generateUsers(OPTS)).toEqual(generateUsers(OPTS));
  });

  test("different seed produces different users", () => {
    const a = generateUsers(OPTS);
    const b = generateUsers({ ...OPTS, seed: "test-2" });
    expect(a.map((u) => u.name).join()).not.toBe(b.map((u) => u.name).join());
  });

  test("returns exactly count users with valid fields", () => {
    const users = generateUsers(OPTS);
    expect(users).toHaveLength(250);
    for (const u of users) {
      expect(u.name).toMatch(/^\S+ \S+/);
      expect(u.fitnessLevel).toBeGreaterThanOrEqual(1);
      expect(u.fitnessLevel).toBeLessThanOrEqual(5);
      expect(u.confidenceLevel).toBeGreaterThanOrEqual(1);
      expect(u.confidenceLevel).toBeLessThanOrEqual(5);
      expect(u.interests.length).toBeGreaterThanOrEqual(2);
      expect(u.goals.length).toBeGreaterThanOrEqual(1);
      expect(u.travelRadiusKm).toBeGreaterThanOrEqual(1);
      for (const c of u.conditions) expect(CONDITION_SLUGS).toContain(c);
      for (const g of u.goals) expect(GOAL_SLUGS).toContain(g);
      for (const i of u.interests) expect(INTEREST_SLUGS).toContain(i);
      expect(new Set(u.conditions).size).toBe(u.conditions.length);
      expect(new Set(u.goals).size).toBe(u.goals.length);
      expect(new Set(u.interests).size).toBe(u.interests.length);
    }
  });

  test("condition mix varies by age band", () => {
    const users = generateUsers({ ...OPTS, count: 400, seed: "band-mix" });
    const young = users.filter((u) => u.ageBand === "18-29" || u.ageBand === "30-44");
    const old = users.filter((u) => u.ageBand === "60-74" || u.ageBand === "75+");
    const rate = (xs: typeof users, slug: string) =>
      xs.filter((u) => u.conditions.includes(slug)).length / Math.max(xs.length, 1);
    expect(rate(old, "arthritis")).toBeGreaterThan(rate(young, "arthritis"));
    expect(rate(young, "anxiety")).toBeGreaterThan(rate(old, "anxiety"));
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd api && bun test seed-users/generator` — FAIL, module not found.

- [ ] **Step 3: Implement per the rules above**
- [ ] **Step 4: Run tests, verify they pass**

Run: `cd api && bun test` — all rng + generator tests PASS. Then `bun run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add api/src/seed-users/generator.ts api/src/seed-users/generator.test.ts
git commit -m "feat(api): deterministic realistic user generator"
```

---

### Task 5: Region resolution + bulk postcodes (`region.ts`, `postcodes.ts`)

**Files:**
- Create: `api/src/seed-users/region.ts`
- Create: `api/src/seed-users/postcodes.ts`
- Test: `api/src/seed-users/region.test.ts` (input-classification only — no network in tests)

**Interfaces:**
- Consumes: `geocodePostcode` from `../lib/geocode.js`.
- Produces:
  - `classifyRegionInput(input: string): { kind: "postcode" | "outcode" | "place"; value: string }`
  - `resolveRegion(input: string): Promise<{ lat: number; lng: number; label: string }>` — throws `Error("could not resolve region: <input>")` on failure.
  - `assignPostcodes(points: { lat: number; lng: number }[]): Promise<(string | null)[]>`

- [ ] **Step 1: Write failing classification tests**

```ts
import { describe, expect, test } from "bun:test";
import { classifyRegionInput } from "./region.js";

describe("classifyRegionInput", () => {
  test("full postcodes", () => {
    expect(classifyRegionInput("E8 3PA")).toEqual({ kind: "postcode", value: "E8 3PA" });
    expect(classifyRegionInput("sw1a1aa")).toEqual({ kind: "postcode", value: "SW1A1AA" });
  });
  test("outcodes", () => {
    expect(classifyRegionInput("E8")).toEqual({ kind: "outcode", value: "E8" });
    expect(classifyRegionInput("N16")).toEqual({ kind: "outcode", value: "N16" });
  });
  test("place names", () => {
    expect(classifyRegionInput("Hackney")).toEqual({ kind: "place", value: "Hackney" });
    expect(classifyRegionInput("Stoke Newington, London")).toEqual({ kind: "place", value: "Stoke Newington, London" });
  });
});
```

Run: `cd api && bun test seed-users/region` — FAIL.

- [ ] **Step 2: Implement `region.ts`**

```ts
import { geocodePostcode } from "../lib/geocode.js";

const FULL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export function classifyRegionInput(input: string): { kind: "postcode" | "outcode" | "place"; value: string } {
  const trimmed = input.trim();
  if (FULL_POSTCODE_RE.test(trimmed)) return { kind: "postcode", value: trimmed.toUpperCase() };
  if (OUTCODE_RE.test(trimmed)) return { kind: "outcode", value: trimmed.toUpperCase() };
  return { kind: "place", value: trimmed };
}

export async function resolveRegion(input: string): Promise<{ lat: number; lng: number; label: string }> {
  const { kind, value } = classifyRegionInput(input);
  if (kind === "postcode") {
    const hit = await geocodePostcode(value);
    if (hit) return { lat: hit.lat, lng: hit.lng, label: hit.postcode };
  } else if (kind === "outcode") {
    try {
      const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(value)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const body = (await res.json()) as { result?: { latitude?: number; longitude?: number } | null };
        if (typeof body.result?.latitude === "number" && typeof body.result?.longitude === "number") {
          return { lat: body.result.latitude, lng: body.result.longitude, label: value };
        }
      }
    } catch { /* fall through to error below */ }
  } else {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", value);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const res = await fetch(url, {
        // Nominatim usage policy requires an identifying User-Agent.
        headers: { "User-Agent": "comunitas-seeder/1.0 (hackathon demo)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const body = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
        const hit = body[0];
        if (hit?.lat && hit.lon) {
          return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name ?? value };
        }
      }
    } catch { /* fall through to error below */ }
  }
  throw new Error(`could not resolve region: ${input}`);
}
```

- [ ] **Step 3: Implement `postcodes.ts`**

```ts
/**
 * Bulk reverse-geocode via postcodes.io (max 100 geolocations per request).
 * Best-effort: any failure degrades to nulls; the schema tolerates missing
 * postcodes and non-UK regions will never resolve.
 */
export async function assignPostcodes(
  points: { lat: number; lng: number }[],
): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(points.length).fill(null);
  for (let offset = 0; offset < points.length; offset += 100) {
    const chunk = points.slice(offset, offset + 100);
    try {
      const res = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geolocations: chunk.map((p) => ({ latitude: p.lat, longitude: p.lng, limit: 1, radius: 1000 })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.warn(`[seed-users] postcode lookup failed for chunk at ${offset}: HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as {
        result?: { result?: { postcode?: string }[] | null }[];
      };
      body.result?.forEach((entry, i) => {
        out[offset + i] = entry.result?.[0]?.postcode ?? null;
      });
    } catch (err) {
      console.warn(`[seed-users] postcode lookup failed for chunk at ${offset}`, err);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests + typecheck, verify pass**

Run: `cd api && bun test && bun run --cwd=.. typecheck` (or `bun run typecheck` from root).

- [ ] **Step 5: Commit**

```bash
git add api/src/seed-users/region.ts api/src/seed-users/region.test.ts api/src/seed-users/postcodes.ts
git commit -m "feat(api): region resolution and bulk postcode assignment for seeder"
```

---

### Task 6: Batch orchestration + DB writes (`run.ts`)

**Files:**
- Create: `api/src/seed-users/run.ts`

**Interfaces:**
- Consumes: `generateUsers` (Task 4), `resolveRegion`/`assignPostcodes` (Task 5), `db`, `tables` from `../db/index.js`, `addNotes` (Task 7 — call site written now behind the `notes` flag, import added in Task 7; until then leave a `// notes pass added in Task 7` placeholder call commented out).
- Produces (consumed by CLI Task 8 and routes Task 9):

```ts
export interface SeedRunOptions {
  region: string;          // place name, postcode, or outcode
  radiusKm?: number;       // default 5
  count: number;           // 1..1000
  seed?: number | string;  // default: the batch id (=> different every run)
  notes?: boolean;         // default true; only takes effect when OPENAI_API_KEY set
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
export function makeBatchId(region: string): string;
export async function runSeed(opts: SeedRunOptions): Promise<SeedRunResult>;
export async function listBatches(): Promise<{ batchId: string; count: number }[]>;
export async function wipeBatch(batchId: string): Promise<number>; // deleted count
```

Implementation notes (follow exactly):

```ts
import { randomBytes } from "node:crypto";
import { count as countFn, eq, isNotNull, sql as dsql } from "drizzle-orm";
import { db, tables } from "../db/index.js";
```

- `makeBatchId`: `region` slugified (lowercase, non-alphanumeric → `-`, trimmed, max 24 chars) + `-` + `YYYYMMDD` from `new Date()` + `-` + `randomBytes(2).toString("hex")`. Randomness here is intentionally non-seeded: two runs with the same RNG seed must still get distinct batch ids.
- `runSeed`:
  1. Validate `count` in 1..1000 and `radiusKm` in 0.5..50 (throw `Error` otherwise — wrappers map to exit code / 400).
  2. `resolveRegion` → center. 3. `makeBatchId`. 4. `generateUsers` with `seed: opts.seed ?? batchId`.
  5. `assignPostcodes` over the users' coords, attach.
  6. Notes pass (Task 7) when `opts.notes !== false`.
  7. Insert inside `db.transaction`, chunks of 50: `patients` rows `{ name, ageBand, postcode, lat, lng, travelRadiusKm, transportModes, mobilityNotes, fitnessNotes, confidenceLevel, fitnessLevel, availability, inductionStatus: "completed", seedBatch: batchId }` using `.returning({ id: tables.patients.id })`; then child rows for conditions/goals/interests keyed by the returned ids (`condition`/`goal`/`interest` column names per schema). Check `api/src/types.ts` for the exact "completed" member of `InductionStatus` and use that literal.
  8. Return the result summary.
- `listBatches`: `select seedBatch, count(*) from patients where seed_batch is not null group by seed_batch order by seed_batch`.
- `wipeBatch`: `delete from patients where seed_batch = $1` via drizzle `.returning({ id })`, return length (children cascade).

- [ ] **Step 1: Implement as above**
- [ ] **Step 2: Typecheck**

Run: `bun run typecheck` — clean.

- [ ] **Step 3: Commit**

```bash
git add api/src/seed-users/run.ts
git commit -m "feat(api): seed run orchestration with batch tagging and wipe"
```

---

### Task 7: Optional LLM notes pass (`notes.ts`)

**Files:**
- Create: `api/src/seed-users/notes.ts`
- Modify: `api/src/seed-users/run.ts` (wire in the call)

**Interfaces:**
- Consumes: `env.OPENAI_API_KEY` from `../env.js`; `GeneratedUser` from `./generator.js`; `Rng` from `./rng.js`.
- Produces: `addNotes(users: GeneratedUser[], rng: Rng): Promise<number>` — mutates ~20% of users' `fitnessNotes`/`mobilityNotes` in place, returns how many users got notes. Returns 0 immediately when no API key. Never throws.

- [ ] **Step 1: Implement `notes.ts`**

```ts
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
```

- [ ] **Step 2: Wire into `run.ts`** — after postcode assignment, `const notesAdded = opts.notes !== false ? await addNotes(users, rng) : 0;` (construct the `Rng` for notes selection as `new Rng(\`${batchId}-notes\`)` so it doesn't perturb the generator stream).

- [ ] **Step 3: Typecheck + full test run**

Run: `bun run typecheck && cd api && bun test` — clean/PASS.

- [ ] **Step 4: Commit**

```bash
git add api/src/seed-users/notes.ts api/src/seed-users/run.ts
git commit -m "feat(api): optional batched LLM notes pass for seeded users"
```

---

### Task 8: CLI wrapper

**Files:**
- Create: `api/src/db/seed-users.ts`
- Modify: `api/package.json`, root `package.json` (scripts)

**Interfaces:**
- Consumes: `runSeed`, `listBatches`, `wipeBatch` from `../seed-users/run.js`; `sql` from `../db/index.js` (to `sql.end()` before exit).

- [ ] **Step 1: Implement with `node:util` `parseArgs`**

```ts
import { parseArgs } from "node:util";
import { sql } from "../db/index.js";
import { listBatches, runSeed, wipeBatch } from "../seed-users/run.js";

const { values } = parseArgs({
  options: {
    region: { type: "string" },
    count: { type: "string", default: "200" },
    radius: { type: "string", default: "5" },
    seed: { type: "string" },
    "no-notes": { type: "boolean", default: false },
    list: { type: "boolean", default: false },
    wipe: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const USAGE = `Seed fake users into a region (tagged, wipeable).

  bun run db:seed:users -- --region "Hackney" --count 300 [--radius 4] [--seed 42] [--no-notes]
  bun run db:seed:users -- --list
  bun run db:seed:users -- --wipe hackney-20260725-ab12

Region accepts a place name ("Hackney", "Bristol"), a UK postcode ("E8 3PA"),
or an outcode ("E8"). Targets whatever DATABASE_URL points at.`;

async function main(): Promise<void> {
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (values.list) {
    const batches = await listBatches();
    if (batches.length === 0) console.log("no seed batches");
    for (const b of batches) console.log(`${b.batchId}\t${b.count} users`);
    return;
  }
  if (values.wipe) {
    const deleted = await wipeBatch(values.wipe);
    console.log(`wiped ${deleted} users from batch ${values.wipe}`);
    return;
  }
  if (!values.region) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const result = await runSeed({
    region: values.region,
    count: Number(values.count),
    radiusKm: Number(values.radius),
    seed: values.seed,
    notes: !values["no-notes"],
  });
  console.log(
    `seeded ${result.count} users into "${result.regionLabel}" (${result.radiusKm} km radius)\n` +
      `batch: ${result.batchId}\n` +
      `postcodes resolved: ${result.postcodesResolved}/${result.count}, llm notes: ${result.notesAdded}\n` +
      `wipe with: bun run db:seed:users -- --wipe ${result.batchId}`,
  );
}

try {
  await main();
} finally {
  await sql.end();
}
```

- [ ] **Step 2: Add scripts**

`api/package.json`: `"db:seed:users": "bun src/db/seed-users.ts"`.
Root `package.json`: mirror however `db:seed` is forwarded there (check and copy the pattern, e.g. `"db:seed:users": "bun run --cwd=api db:seed:users"`).

- [ ] **Step 3: Smoke test against local DB**

```bash
bun run db:seed:users -- --region "Hackney" --count 50 --no-notes
bun run db:seed:users -- --list
bun run db:seed:users -- --wipe <batch id printed above>
bun run db:seed:users -- --list
```

Expected: 50 users seeded with a printed batch id; list shows the batch; wipe deletes 50; list empty again. Verify demo data untouched: `psql comunitas -c "select count(*) from patients"` returns the same count before seed and after wipe.

- [ ] **Step 4: Commit**

```bash
git add api/src/db/seed-users.ts api/package.json package.json
git commit -m "feat(api): db:seed:users CLI for regional demo seeding"
```

---

### Task 9: Admin HTTP routes + SEED_SECRET

**Files:**
- Create: `api/src/routes/admin-seed.ts`
- Modify: `api/src/index.ts` (mount + allow header), `api/src/env.ts` (SEED_SECRET), `.env.example`

**Interfaces:**
- Consumes: `runSeed`, `listBatches`, `wipeBatch` (Task 6); `env` (modified here).
- Produces: routes mounted at `/api/admin/seed-users`.

- [ ] **Step 1: Add `SEED_SECRET` to env**

`api/src/env.ts`, in the `env` object:

```ts
  /** Gates the admin seeding endpoint; unset -> the endpoint 404s (safe by default). */
  SEED_SECRET: process.env.SEED_SECRET?.trim() || "",
```

`.env.example`: add under the existing entries:

```
# Gates POST/GET/DELETE /api/admin/seed-users. Leave unset to disable the endpoint.
SEED_SECRET=
```

- [ ] **Step 2: Implement `api/src/routes/admin-seed.ts`**

Follow the style of existing routes (`api/src/routes/patients.ts` — zod-validator, `fail()` helper if one exists there; otherwise plain `HTTPException`):

```ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { timingSafeEqual, createHash } from "node:crypto";
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
```

- [ ] **Step 3: Mount in `api/src/index.ts`**

```ts
import { adminSeedRoutes } from "./routes/admin-seed.js";
// ...
app.route("/api/admin/seed-users", adminSeedRoutes);
```

Add `"x-seed-secret"` to the CORS `allowHeaders` array.

- [ ] **Step 4: Live-verify auth behaviour**

With the API running locally (`bun run dev`), `SEED_SECRET` unset:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3001/api/admin/seed-users -H 'content-type: application/json' -d '{"region":"Hackney","count":5}'
```

Expected: `404`. Then set `SEED_SECRET=testsecret` in `.env`, restart, and:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3001/api/admin/seed-users -H 'content-type: application/json' -d '{"region":"Hackney","count":5}'   # 401
curl -s -X POST localhost:3001/api/admin/seed-users -H 'content-type: application/json' -H 'x-seed-secret: testsecret' -d '{"region":"Hackney","count":5,"notes":false}'  # 201 + JSON summary
curl -s localhost:3001/api/admin/seed-users -H 'x-seed-secret: testsecret'  # batch list
curl -s -X DELETE localhost:3001/api/admin/seed-users/<batchId> -H 'x-seed-secret: testsecret'  # {"deleted":5}
```

Remove `SEED_SECRET` from `.env` afterwards (leave `.env.example` documenting it).

- [ ] **Step 5: Typecheck + commit**

```bash
bun run typecheck
git add api/src/routes/admin-seed.ts api/src/index.ts api/src/env.ts .env.example
git commit -m "feat(api): secret-gated admin endpoint for regional user seeding"
```

---

### Task 10: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the feature**

Add a "Seeding demo users" subsection under Development covering: the CLI examples from Task 8's USAGE text, the three HTTP endpoints with the `x-seed-secret` header, `SEED_SECRET` env var (endpoint disabled when unset), batch tagging/wipe semantics (`seed_batch` column; demo data and real users are never touched by wipe), and the note that `--seed` makes runs reproducible while omitting it gives fresh users each run.

- [ ] **Step 2: Full verification sweep**

```bash
bun run typecheck
cd api && bun test && cd ..
bun run db:seed:users -- --region "E8" --count 200
# -> open the app, check /map and pod pages still work, spot-check a seeded
#    profile via GET /api/patients/<id> for coherent conditions/goals/interests
bun run db:seed:users -- --list
bun run db:seed:users -- --wipe <batch>
```

Expected: all clean; seeded users appear near Hackney with real E8-ish postcodes; wipe restores the previous patient count.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: seeding demo users (CLI + admin endpoint)"
```
