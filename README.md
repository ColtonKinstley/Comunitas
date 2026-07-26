# Comunitas

Most GP perceptions and almost all preventative medicine isn't for drugs - it's
lifestyle intervention. When a patient is given given this advice they are
typically handed a pamphlet and sent on their way. Development of a program,
adherence and support are all left up to the patient. Very little if any
support is available despite adherence and success in a program being critical
to the acute and long term health of the patient. 

**Comunitas** helps patients with similar health goals find community and
activities to support their health journey. We match patients and activities
geographically with a focus on existing health conditions and lifestyle goals.
We use sophisticated machine learning methods to match patients together with
appropriate activities on their existing health conditions, goals, and starting
fitness state. Our AI activity booking agents take the overhead out of
planning, managing, and organizing events. No single person is responsible for
event planning. Events will be discovered from what's already popular in your
area or created ad-hoc. In an inversion of the typical meetup process, the
group is decided first, and the event is chosen to match their needs.

See [docs/project-plan.md](docs/project-plan.md) for the product brief and
[docs/superpowers/specs/2026-07-25-induction-app-design.md](docs/superpowers/specs/2026-07-25-induction-app-design.md)
for the induction app design.

## The app

A mobile-first responsive web app (phone-framed on desktop) covering the
patient-facing loop:

- **Voice induction** — a real conversation, not a form. An AI interviewer on
  OpenAI's Realtime API (`gpt-realtime-2.1`, WebRTC) discovers the patient's
  location and travel range, health conditions, goals, starting fitness,
  interests, weekly availability, and constraints — filling a live profile card
  as it learns. Ends with the pod reveal. Falls back to typed chat
  automatically when no microphone is available (or with `/induction?mode=text`).
- **Home** — next event with one-tap RSVP, pod snapshot, attendance streak.
- **Learn** — Duolingo-style bite-sized lessons on the habits behind the plan
  (sleep, protein, fibre, water, movement). Lessons unlock sequentially along
  one track, mix info cards with quick check questions, and award 10 XP each;
  progress is stored on the server so it follows the patient across devices.
- **Profile** — the structured, matcher-ready profile; every section
  tap-to-edit, postcodes geocoded via postcodes.io. An Induction card lets you
  finish a skipped induction or redo a completed one (the conversation resumes
  on the same patient and re-runs pod matching).
- **Skippable induction** — signed-in users can skip the induction from its
  intro screen (a bare patient record is created so the rest of the app works);
  a banner pinned above every screen offers the way back in until it's done.
- **Pod** — who you're matched with (first names and shared interests only —
  no one else's health data), and where the group meets.
- **Calendar** — month view with per-day agenda of pod activities.
- **Map** — Leaflet/OpenStreetMap view of you, your travel radius, upcoming
  event venues, and approximate pod-member locations.
- **Events & history** — upcoming feed with RSVPs, past timeline with
  attendance and adherence streaks.
- **Sign-in** — optional "Continue with Google" / "Continue with GitHub"
  buttons on the welcome
  screen link your browser session to a patient record (via better-auth), so
  the app remembers you across devices; sign out from Profile. The anonymous
  flows — voice induction and **Continue as Priya (demo)** — are unaffected
  and remain the fastest way in.

Pod assignment currently uses a nearest-pod heuristic (geography first, per the
product thesis); the profile schema is deliberately rich so the real matching
engine can slot in behind the same API.

## Development

A bun workspace monorepo:

| Workspace | Stack                                                    | Port |
| --------- | -------------------------------------------------------- | ---- |
| `api/`    | Bun + Hono + Drizzle ORM + Postgres                      | 3001 |
| `web/`    | Vite + React + TypeScript + Tailwind v4 + react-router   | 5173 |

Both servers bind `0.0.0.0`, so you can open the app from another device on the
network. The web dev server proxies `/api` → `http://localhost:3001`.

### Prerequisites

- [bun](https://bun.sh) 1.3+
- PostgreSQL 18 running locally on port 5432
  (`brew install postgresql@18 && brew services start postgresql@18`)
- A database named `comunitas`: `createdb comunitas`
- An `OPENAI_API_KEY` for the voice induction (everything else works without one)
- Google and/or GitHub OAuth credentials for sign-in (optional; the app works anonymously)

### Setup

```sh
bun install
cp .env.example .env      # then edit DATABASE_URL if your DB user is not your macOS username
bun run db:push           # create tables (drizzle-kit push, no migration files)
bun run db:seed           # load the demo data
```

`.env` is gitignored. `OPENAI_API_KEY` can be left blank in the file and
exported in your shell instead — the API falls back to `process.env`.

**Environment variables:**

| Variable               | Purpose                                                                   | Required |
| ---------------------- | ------------------------------------------------------------------------- | -------- |
| `BETTER_AUTH_URL`      | Origin the app is opened from. Use the tailscale HTTPS origin when demoing on a phone. | No       |
| `BETTER_AUTH_SECRET`   | Secret key for auth sessions (run `openssl rand -base64 32` to generate)  | No       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client (get from console.cloud.google.com/apis/credentials)  | No       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                 | No       |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app (github.com/settings/developers → OAuth Apps)             | No       |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret                                                    | No       |

Sign-in is optional; everything works anonymously without auth configuration.

When Google credentials are set, register `<BETTER_AUTH_URL>/api/auth/callback/google`
as an authorized redirect URI in the Google Cloud Console for **both** origins you use
the app from: `http://localhost:5173/api/auth/callback/google` and
`https://macmini.taildd0824.ts.net/api/auth/callback/google`.

For GitHub, create an OAuth app at github.com/settings/developers with the
authorization callback URL `<BETTER_AUTH_URL>/api/auth/callback/github`. GitHub
OAuth apps allow only one callback URL, so create one app per origin (or just
one for the origin you demo from).

### Run

```sh
bun run dev               # api on :3001 and web on :5173, together
```

Then open <http://localhost:5173>. The root page is the static marketing
landing page (`web/index.html`); its **Find my pod** buttons lead to
<http://localhost:5173/welcome>, the app's welcome screen, which offers
**Start your induction** (new patient, voice interview) or **Continue as
Priya (demo)**, which loads the seeded demo patient with a five-week
attendance streak. Every app route lives in `web/app.html` (see the
`appHtmlFallback` plugin in `web/vite.config.ts`).

### Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `bun run dev`        | Runs the api and web dev servers together             |
| `bun run db:push`    | Syncs `api/src/db/schema.ts` to Postgres              |
| `bun run db:seed`    | Truncates and reloads the demo data (idempotent)      |
| `bun run db:reset`   | `db:push --force` then `db:seed`                      |
| `bun run db:seed:users` | Seeds fake users into a region (see below)         |
| `bun run typecheck`  | Typechecks both workspaces                            |

### Seed data

21 patients across Hackney, Bethnal Green, Islington and Camden with real
postcodes and coordinates, in three pods — Victoria Park Walkers, Islington
Strength & Balance, Regent's Canal Cyclists. Each pod has five or six completed
activities with attendance history plus three upcoming ones at real venues. All
timestamps are relative to the moment you run the seed, so "past" and
"upcoming" stay correct.

The demo patient is **Priya Shah** (`GET /api/demo` returns her id). She starts
three lessons into the learn track (the sleep unit plus the first protein
lesson), so the Learn path lands mid-track with the next lesson lit.

### Seeding demo users

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

Re-run `bun run db:reset` before a demo — E2E induction runs and RSVP clicks
mutate the seed state. A patient id in localStorage that no longer exists after
a reset is handled: the app clears the session and returns to the welcome screen.

## Deployment (Vercel)

Two Vercel projects deployed from this one repo:

| Project         | Root dir | What Vercel does                                        |
| --------------- | -------- | ------------------------------------------------------- |
| `comunitas-api` | `api/`   | Detects Hono (`src/index.ts` default-exports the app); every route becomes a Fluid-compute function |
| `comunitas-web` | `web/`   | Vite static build; `web/vercel.json` rewrites `/api/*` to the api deployment (same-origin, no CORS) and falls back to `app.html` for react-router (`index.html` is the static landing page at `/`) |

- `api/src/index.ts` exports the bare Hono app for Vercel; local dev goes
  through `api/src/dev.ts`, which adds the Bun port/hostname config.
- The api project needs `DATABASE_URL` (a hosted Postgres — use the *pooled*
  connection string; the client sets `prepare: false` for pooler
  compatibility) and `OPENAI_API_KEY` env vars.
- Schema and seed are pushed from a local machine:
  `DATABASE_URL=<hosted url> bun run db:push && DATABASE_URL=<hosted url> bun run db:seed`.
- If the api project's URL is not `comunitas-api.vercel.app`, update the
  rewrite destination in `web/vercel.json`.
- **Relative imports in `api/src` must carry `.js` extensions** (NodeNext
  resolution). Vercel compiles the api per-file with tsc, so an extensionless
  `./routes/demo` fails at runtime with `ERR_MODULE_NOT_FOUND`. Bun, tsx and
  drizzle-kit all resolve the `.js` specifiers back to `.ts` locally.
- **`api/` pins TypeScript 5.x** (not the repo-wide TS 7): Vercel's Hono
  builder loads the local TypeScript's JS compiler API, which TS 7 (the native
  port) doesn't expose — builds die with
  `Cannot read properties of undefined (reading 'readFile')`.

### Gotchas

- **`web/src/lib/types.ts` is a manual copy of `api/src/types.ts`.** If you
  change an API payload, update both — nothing enforces the sync.
- **Postgres 18 is what's tested.** Older versions will almost certainly work
  (plain tables, no extensions), but nobody has verified that claim.
- **Tests only cover the user seeder.** `cd api && bun test` runs the seeder's
  pure-module tests; everything else is `bun run typecheck` plus manual /
  Playwright-driven QA.
- **No `OPENAI_API_KEY`?** Everything works except starting a voice induction —
  the realtime session endpoint will error, the rest of the app is unaffected.
