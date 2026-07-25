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

### Setup

```sh
bun install
cp .env.example .env      # then edit DATABASE_URL if your DB user is not your macOS username
bun run db:push           # create tables (drizzle-kit push, no migration files)
bun run db:seed           # load the demo data
```

`.env` is gitignored. `OPENAI_API_KEY` can be left blank in the file and
exported in your shell instead — the API falls back to `process.env`.

### Run

```sh
bun run dev               # api on :3001 and web on :5173, together
```

Then open <http://localhost:5173>. The welcome screen offers **Start your
induction** (new patient, voice interview) or **Continue as Priya (demo)**,
which loads the seeded demo patient with a five-week attendance streak.

### Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `bun run dev`        | Runs the api and web dev servers together             |
| `bun run db:push`    | Syncs `api/src/db/schema.ts` to Postgres              |
| `bun run db:seed`    | Truncates and reloads the demo data (idempotent)      |
| `bun run db:reset`   | `db:push --force` then `db:seed`                      |
| `bun run typecheck`  | Typechecks both workspaces                            |

### Seed data

21 patients across Hackney, Bethnal Green, Islington and Camden with real
postcodes and coordinates, in three pods — Victoria Park Walkers, Islington
Strength & Balance, Regent's Canal Cyclists. Each pod has five or six completed
activities with attendance history plus three upcoming ones at real venues. All
timestamps are relative to the moment you run the seed, so "past" and
"upcoming" stay correct.

The demo patient is **Priya Shah** (`GET /api/demo` returns her id).
