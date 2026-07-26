# Random User Seeder — Design

**Date:** 2026-07-25
**Status:** Approved (scoped via Q&A with Colton)

## Purpose

Seed hundreds of realistic fake patients into any geographic region — including
sections of London — so the product can be demoed and the matching algorithm
exercised at scale. Works against the local dev database (CLI) and the deployed
production database (authenticated HTTP endpoint).

## Decisions (from scoping Q&A)

| Question | Decision |
| --- | --- |
| Interface | Both: CLI wrapper + HTTP endpoint over one shared generator module |
| Region input | Place name + radius **and** postcode + radius |
| Realism | Hybrid: local weighted generator for all structured fields; one batched LLM pass adds free-text notes to ~20% of users |
| Pods | Users only, **unassigned** — the matcher is exercised manually afterwards |
| Deployment | API already deployed; endpoint is the prod path, CLI is for local dev. No Vercel work in scope |
| Endpoint auth | Shared secret header (`x-seed-secret` vs `SEED_SECRET` env var) |
| Cleanup | Every run tagged with a batch id; wipe by batch without touching demo data or real users |

## Architecture

One pure generator module with two thin wrappers.

```
api/src/seed-users/
  generator.ts     # pure: (resolved region, count, rng seed) -> rows
  region.ts        # place name / postcode -> centroid lat/lng
  postcodes.ts     # bulk reverse-geocode sampled points -> real postcodes
  notes.ts         # optional batched LLM pass for free-text notes
  batch.ts         # batch id creation, list batches, wipe batch
  data.ts          # name pools, correlation tables, weights
api/src/db/seed-users.ts        # CLI wrapper (bun run db:seed:users)
api/src/routes/admin-seed.ts    # HTTP wrapper (Hono routes)
```

### Generator (`generator.ts`, `data.ts`)

Pure function: `generateUsers({ center, radiusKm, count, seed, batchId, regionLabel })`
returns fully-formed insert rows for `patients`, `patient_conditions`,
`patient_goals`, `patient_interests`. No I/O.

Realism via weighted tables, all driven by a **seeded PRNG** (mulberry32-style)
so identical inputs reproduce identical users:

- **Names:** curated UK-plausible first/last name pools reflecting London's
  demographic mix; first names loosely correlated with age band.
- **Age bands:** weighted toward the app's target population (skewing 45+, but
  every band represented).
- **Conditions → goals → interests:** a correlation matrix over the existing
  client vocab slugs (`web/src/features/profile/vocab.ts`) — e.g. type-2
  diabetes → weight-loss goal → walking/swimming; anxiety → stress-reduction →
  yoga/gardening. 0–3 conditions per user; goals and interests sampled with
  affinity to conditions plus random noise so users aren't stereotypes.
- **Fitness/confidence (1–5):** correlated with age band and condition count.
- **Availability:** archetypes — working-age users get evenings/weekends,
  retired users get weekday mornings/afternoons, plus jitter.
- **Transport & travel radius:** correlated (car/cycle → larger radius,
  walk-only → 1–3 km).
- **Coordinates:** sampled inside the radius with mild clustering around
  2–4 sub-centers (people bunch; uniform dust looks fake on the map).
- `inductionStatus: "completed"`, `seedBatch: batchId`, no pod membership.

### Region resolution (`region.ts`)

- Input looks like a UK postcode → existing `geocodePostcode`
  (`api/src/lib/geocode.ts`, postcodes.io).
- Otherwise treat as a place name → Nominatim (OpenStreetMap) search API,
  free/keyless, one request per run, `User-Agent` set per their policy.
  Handles London boroughs ("Hackney") and any city/region worldwide.
- Failure → hard error with a clear message; nothing is written.

### Postcode assignment (`postcodes.ts`)

Sampled points get real postcodes via postcodes.io **bulk reverse-geocode**
(`POST /postcodes`, 100 geolocations per request → 300 users = 3 requests).
Points with no postcode result (rural gaps, non-UK regions) keep lat/lng and a
null postcode — the schema and app already tolerate that. Lookup failures
degrade to null postcodes with a logged warning; they never abort the run.

### LLM notes pass (`notes.ts`)

After structured generation, pick ~20% of users and make **one** batched
OpenAI chat request (existing `OPENAI_API_KEY`) returning JSON:
short human `fitnessNotes` / `mobilityNotes` / per-condition notes consistent
with each user's structured profile. Skipped silently when the key is absent;
any API failure logs a warning and proceeds without notes. Never blocks or
fails a run.

### Batch tagging (`batch.ts` + schema change)

- New nullable column on `patients`: `seed_batch text` (plus an index).
  Applied via the existing `drizzle-kit push` flow — must also be pushed to
  the prod database once.
- Batch ids: `<slugified-region>-<yyyymmdd>-<4 rng chars>`, e.g.
  `hackney-20260725-x4f2`.
- Wipe = `DELETE FROM patients WHERE seed_batch = $1`; child rows cascade.
  Hand-written demo data and real signups have `seed_batch IS NULL` and are
  untouchable by wipe.
- List = `SELECT seed_batch, count(*) ... GROUP BY seed_batch`.

### CLI (`api/src/db/seed-users.ts`)

```
bun run db:seed:users -- --region "Hackney" --count 300 [--radius 4]
                         [--seed 42] [--no-notes]
bun run db:seed:users -- --list
bun run db:seed:users -- --wipe hackney-20260725-x4f2
```

Targets whatever `DATABASE_URL` points at (so it can also hit prod from a
laptop). Prints the batch id, counts, and region centroid on success.

### HTTP endpoint (`api/src/routes/admin-seed.ts`)

- `POST   /api/admin/seed-users`  body: `{ region?, postcode?, radiusKm?, count, seed?, notes? }`
- `GET    /api/admin/seed-users`  → list of batches with counts
- `DELETE /api/admin/seed-users/:batchId`

All three require header `x-seed-secret` equal to `SEED_SECRET`. If
`SEED_SECRET` is unset the routes return 404 — safe by default in prod.
Constant-time comparison for the secret. `count` capped at 1000 per request.

## Error handling summary

| Failure | Behaviour |
| --- | --- |
| Region not found | 400 / CLI error, nothing written |
| postcodes.io bulk lookup fails | null postcodes + warning, run continues |
| LLM call fails / no key | no notes, warning, run continues |
| Bad/missing secret | 401 (404 when SEED_SECRET unset) |
| DB insert fails mid-run | inserts wrapped in a transaction; nothing partial |

## Testing / verification

Repo has no test suite; verification is `bun run typecheck` plus a live local
run: seed a London borough, confirm counts, list batches, wipe the batch,
confirm demo data intact; hit the endpoint with and without the secret.

## Out of scope

- Pod creation / clustering (users are seeded unassigned)
- Vercel deployment work
- Events/RSVPs/attendance history for seeded users
- Non-UK postcode systems (non-UK regions get null postcodes)

## Docs

- `.env.example`: add `SEED_SECRET`
- `README.md`: document `db:seed:users`, the admin endpoint, and batch wipe
