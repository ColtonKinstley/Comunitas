# CLAUDE.md

## Development

- The user connects to this machine over Tailscale. Always run dev servers bound to
  `0.0.0.0` (not `localhost`/`127.0.0.1`) so they are reachable from other devices
  on the tailnet, and share URLs using the machine's Tailscale hostname/IP rather
  than `localhost`.

## Deployment (Vercel)

- Live at <https://comunitas-web.vercel.app> (app) and
  <https://comunitas-api.vercel.app> (api). Two CLI-linked Vercel projects, no git
  integration — **merging to main does not deploy**. Deploy with
  `vercel deploy --prod --yes` from `api/` or `web/` (project links live in the
  gitignored `api/.vercel` / `web/.vercel`; CLI is logged in as coltonkinstley).
- `web/vercel.json` rewrites `/api/*` to the `comunitas-api.vercel.app` alias
  (same-origin, no CORS) and has the SPA fallback. Update the destination if the
  api alias ever changes.
- Database is Neon via the Vercel marketplace (resource `neon-lime-elephant`,
  connected to the `comunitas-api` project). `DATABASE_URL` (pooled),
  `DATABASE_URL_UNPOOLED`, and `OPENAI_API_KEY` are set in the project's
  production env. After changing env vars, redeploy the api to pick them up.
- **Build constraints — do not regress these:**
  - Relative imports in `api/src` must keep their `.js` extensions (NodeNext).
    Vercel compiles the api per-file with tsc, so an extensionless import fails
    at runtime with `ERR_MODULE_NOT_FOUND`. Bun/tsx/drizzle-kit resolve
    `.js` → `.ts` locally.
  - `api/` pins TypeScript 5.x while the rest of the repo uses TS 7. Vercel's
    Hono builder loads the local TypeScript's JS compiler API, which TS 7 (the
    native port) doesn't expose — builds fail with
    `Cannot read properties of undefined (reading 'readFile')`.
- Reset the hosted DB before demos (demo clicks and induction runs mutate it):
  `vercel env pull <tmpfile> --environment=production --yes` from `api/`, run
  `DATABASE_URL=<DATABASE_URL_UNPOOLED value> bun run db:reset` (unpooled is
  safer for DDL), then delete the pulled env file.
