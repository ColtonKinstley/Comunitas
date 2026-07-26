# Development

A bun workspace monorepo:

| Workspace | Stack                                                    | Port |
| --------- | -------------------------------------------------------- | ---- |
| `api/`    | Bun + Hono + Drizzle ORM + Postgres                      | 3001 |
| `web/`    | Vite + React + TypeScript + Tailwind v4 + react-router   | 5173 |

Both servers bind `0.0.0.0`, so you can open the app from another device on the
network. The web dev server proxies `/api` → `http://localhost:3001`.

## Prerequisites

- [bun](https://bun.sh) 1.3+
- PostgreSQL 18 running locally on port 5432
  (`brew install postgresql@18 && brew services start postgresql@18`)
- A database named `comunitas`: `createdb comunitas`
- An `OPENAI_API_KEY` for the voice induction (everything else works without one)
- Google and/or GitHub OAuth credentials for sign-in (optional; the app works anonymously)

## Setup

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

## Run

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

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `bun run dev`        | Runs the api and web dev servers together             |
| `bun run db:push`    | Syncs `api/src/db/schema.ts` to Postgres              |
| `bun run db:seed`    | Truncates and reloads the demo data (idempotent)      |
| `bun run db:reset`   | `db:push --force` then `db:seed`                      |
| `bun run db:seed:users` | Seeds fake users into a region (see [api/README.md](../api/README.md)) |
| `bun run typecheck`  | Typechecks both workspaces                            |

Seed data details and the bulk demo-user seeder are documented in
[api/README.md](../api/README.md). Deployment is documented in
[deployment.md](deployment.md).

## Gotchas

- **`web/src/lib/types.ts` is a manual copy of `api/src/types.ts`.** If you
  change an API payload, update both — nothing enforces the sync.
- **Postgres 18 is what's tested.** Older versions will almost certainly work
  (plain tables, no extensions), but nobody has verified that claim.
- **Tests only cover the user seeder.** `cd api && bun test` runs the seeder's
  pure-module tests; everything else is `bun run typecheck` plus manual /
  Playwright-driven QA.
- **No `OPENAI_API_KEY`?** Everything works except starting a voice induction —
  the realtime session endpoint will error, the rest of the app is unaffected.
