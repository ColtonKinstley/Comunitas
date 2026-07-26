# Deployment (Vercel)

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

## Build constraints — do not regress these

- **Relative imports in `api/src` must carry `.js` extensions** (NodeNext
  resolution). Vercel compiles the api per-file with tsc, so an extensionless
  `./routes/demo` fails at runtime with `ERR_MODULE_NOT_FOUND`. Bun, tsx and
  drizzle-kit all resolve the `.js` specifiers back to `.ts` locally.
- **`api/` pins TypeScript 5.x** (not the repo-wide TS 7): Vercel's Hono
  builder loads the local TypeScript's JS compiler API, which TS 7 (the native
  port) doesn't expose — builds die with
  `Cannot read properties of undefined (reading 'readFile')`.
