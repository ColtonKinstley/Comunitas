# Comunitas API

Bun + Hono + Drizzle ORM + Postgres. Runs on port 3001 in development
(`bun run dev` from the repo root starts it together with the web app); see
[docs/development.md](../docs/development.md) for setup and
[docs/deployment.md](../docs/deployment.md) for the Vercel deployment.

Entry points: `src/index.ts` exports the bare Hono app (what Vercel deploys);
`src/dev.ts` wraps it with the Bun port/hostname config for local dev. The
schema lives in `src/db/schema.ts` and is pushed with drizzle-kit
(`bun run db:push`, no migration files).

## Seed data

21 patients across Hackney, Bethnal Green, Islington and Camden with real
postcodes and coordinates, in three pods — Victoria Park Walkers, Islington
Strength & Balance, Regent's Canal Cyclists. Each pod has five or six completed
activities with attendance history plus three upcoming ones at real venues. All
timestamps are relative to the moment you run the seed, so "past" and
"upcoming" stay correct.

The demo patient is **Priya Shah** (`GET /api/demo` returns her id). She starts
three lessons into the learn track (the sleep unit plus the first protein
lesson), so the Learn path lands mid-track with the next lesson lit.

Re-run `bun run db:reset` before a demo — E2E induction runs and RSVP clicks
mutate the seed state. A patient id in localStorage that no longer exists after
a reset is handled: the app clears the session and returns to the welcome screen.

## Seeding demo users

Generate hundreds of realistic fake patients in any geographic region, tagged
per run and wipeable without touching the demo data or real users:

```sh
bun run db:seed:users -- --region "Hackney" --count 300 [--radius 4] [--seed 42] [--no-notes]
bun run db:seed:users -- --list
bun run db:seed:users -- --wipe hackney-20260725-ab12
```

`--region` accepts a place name ("Hackney", "Bristol"), a UK postcode
("E8 3PA"), or an outcode ("E8"). Coordinates cluster naturally inside the
radius and get real postcodes via postcodes.io. With an `OPENAI_API_KEY` set,
one batched LLM call adds free-text notes to ~20% of users; `--no-notes` skips
it. Passing `--seed` makes a run reproducible; omitting it generates fresh
users each run. The CLI targets whatever `DATABASE_URL` points at.

Every generated patient carries the run's batch id in `patients.seed_batch`;
wiping deletes exactly `WHERE seed_batch = <batch>` (children cascade), so demo
data and real users — whose `seed_batch` is null — are never touched.

The same operations exist over HTTP for deployed environments, gated by a
`SEED_SECRET` env var on the api. When `SEED_SECRET` is unset the endpoint
404s; when set, requests must carry it in the `x-seed-secret` header:

```sh
curl -X POST $API/api/admin/seed-users -H 'content-type: application/json' \
  -H "x-seed-secret: $SEED_SECRET" -d '{"region":"E8","count":200,"radiusKm":4}'
curl $API/api/admin/seed-users -H "x-seed-secret: $SEED_SECRET"            # list batches
curl -X DELETE $API/api/admin/seed-users/<batchId> -H "x-seed-secret: $SEED_SECRET"
```

## Pod matching

`src/lib/matching.ts` is a pure module (no DB imports) that decides which pod
a patient joins at the end of induction. All strategies share the same
geography gate — only pods inside the patient's travel radius compete on fit;
nothing in range → nearest pod wins outright; no coordinates on either side →
smallest pod:

- `matchNearest` — the original baseline: most member-shared interests inside
  the radius, distance breaks ties.
- `matchComposite` — weighted sum of geo decay plus goal/condition/interest
  overlap with the pod's member profile, fitness proximity and availability
  fit, with a soft size penalty above 12 members.
- `matchAffinity` — mean pairwise patient↔member similarity (Jaccard on
  goals/interests/conditions/availability slots, fitness closeness), scaled by
  the same geo decay and size factor.

`chooseBestPod` is the strategy wired into
`POST /api/patients/:id/complete-induction` — currently `matchComposite`,
picked by the offline eval. Compare the strategies on generated users (no DB,
no network) with `bun run eval:matching`.

## Tests

`bun test` from this directory runs the pure-module tests (the user seeder and
the pod matcher) — the only automated tests in the repo; everything else is
`bun run typecheck` plus manual / Playwright-driven QA.
