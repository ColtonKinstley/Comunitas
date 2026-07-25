# Better-Auth Social Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patients can sign in with Google (and later Apple), with their auth identity linked to their Comunitas patient record — while the no-auth demo paths ("Continue as Priya", direct induction) keep working untouched.

**Architecture:** better-auth runs inside the existing Hono API, mounted at `/api/auth/*`, storing users/sessions/accounts in the existing Postgres via the Drizzle adapter. A nullable `patients.user_id` column links an auth user to at most one patient. The React SPA uses better-auth's React client through the existing Vite `/api` proxy, so all auth traffic is same-origin and cookie-based — no CORS or token plumbing. A new `/api/me` endpoint resolves session → patient; a `/api/me/claim` endpoint links a freshly-inducted (or pre-existing localStorage) patient to the signed-in user.

**Tech Stack:** better-auth (latest, ^1.x), Drizzle ORM (pg), Hono, Bun, React 19 + react-router, Vite proxy.

## Global Constraints

- **Bun everywhere**: install with `bun add <pkg>` inside the workspace dir (`api/` or `web/`), never edit package.json by hand.
- **No test suite exists in this repo** (see README "Gotchas"). Verification is `bun run typecheck` + `curl` smoke tests + manual browser QA. Do not create a test framework; the "test" steps below are typecheck/curl/browser steps by design.
- **`web/src/lib/types.ts` is a manual copy of `api/src/types.ts`** — any shared payload type added to one MUST be added to the other.
- **Env**: all secrets live in the gitignored root `.env`; every new var gets a commented entry in `.env.example`. `api/src/env.ts` is the only place `process.env` is read.
- **Demo flows must not regress**: "Continue as Priya (demo)" and anonymous voice induction must work with zero auth env vars set. Google sign-in degrades gracefully (button hidden or erroring politely) when `GOOGLE_CLIENT_ID` is unset.
- **Dev servers bind `0.0.0.0`**; the app is accessed via `http://localhost:5173` and `https://macmini.taildd0824.ts.net` (tailscale serve → Vite :5173). Both origins go through the Vite proxy, so auth cookies are always first-party.
- **`bun run db:seed` truncates `patients ... cascade` but NOT the better-auth tables** — after a reset, signed-in users keep their account but lose their patient link (`user_id` row is gone). `/api/me` returning `patientId: null` for a valid session is therefore a normal state, not an error.
- Commit format: conventional commits (`feat: …`, `docs: …`), matching repo history.

## User Prerequisites (before Task 4 can be demoed)

Not agent work — the human must do this in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Create an OAuth 2.0 Client ID (type "Web application").
2. Authorized redirect URIs — add **both**:
   - `http://localhost:5173/api/auth/callback/google`
   - `https://macmini.taildd0824.ts.net/api/auth/callback/google`
3. Put the client id/secret in `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Set `BETTER_AUTH_URL` in `.env` to the origin being demoed: `http://localhost:5173` for desk testing, `https://macmini.taildd0824.ts.net` for phone-over-tailscale testing. (better-auth builds the callback URL from this; a mismatch = Google `redirect_uri_mismatch` error.)
5. Generate a secret: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`.

---

### Task 1: better-auth server config + env

**Files:**
- Create: `api/src/lib/auth.ts`
- Modify: `api/src/env.ts` (add 4 vars to the exported `env` object)
- Modify: `.env.example`
- Modify: `README.md` (env var table / prerequisites blurb)

**Interfaces:**
- Consumes: `db` from `api/src/db/index.ts` (existing drizzle instance), `env` from `api/src/env.ts`.
- Produces: `export const auth` — a `betterAuth` instance. Later tasks use `auth.handler(request: Request): Promise<Response>` and `auth.api.getSession({ headers: Headers })` which resolves to `{ user: { id: string; name: string; email: string; image?: string | null } } | null`.

- [ ] **Step 1: Install better-auth in the api workspace**

```bash
cd api && bun add better-auth
```

- [ ] **Step 2: Add env vars to `api/src/env.ts`**

Append to the existing `env` object (keep the existing style — trimmed strings, sensible empty defaults so the API boots with no auth config):

```ts
  /** Origin the app is served from; better-auth derives OAuth callback URLs from it. */
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL?.trim() || "http://localhost:5173",
  /** Required in practice for sign-in; empty default keeps demo flows bootable. */
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET?.trim() || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim() || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
```

- [ ] **Step 3: Create `api/src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { env } from "../env";

/**
 * Auth lives inside the API but is addressed by the *web* origin: the Vite
 * dev server proxies `/api` here, so callbacks and cookies are all first-party
 * on :5173 (or the tailscale-serve HTTPS origin). BETTER_AUTH_URL must match
 * whichever origin the browser is actually on.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET || undefined,
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: env.GOOGLE_CLIENT_ID
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  trustedOrigins: [
    "http://localhost:5173",
    "https://macmini.taildd0824.ts.net",
  ],
});
```

- [ ] **Step 4: Update `.env.example`**

Append:

```sh
# --- Auth (better-auth) ---
# Origin the app is opened from. Use the tailscale HTTPS origin when demoing on a phone.
BETTER_AUTH_URL=http://localhost:5173
# openssl rand -base64 32
BETTER_AUTH_SECRET=
# Google OAuth client (console.cloud.google.com/apis/credentials).
# Redirect URI: <BETTER_AUTH_URL>/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck` (repo root). Expected: both workspaces pass.

- [ ] **Step 6: Update README** — add the four vars to the setup section with one line each (copy the `.env.example` comments), and note sign-in is optional: everything still works anonymously.

- [ ] **Step 7: Commit**

```bash
git add api/src/lib/auth.ts api/src/env.ts .env.example README.md api/package.json bun.lock
git commit -m "feat: better-auth server config with optional Google provider"
```

---

### Task 2: auth tables in Drizzle schema

**Files:**
- Create: `api/src/db/auth-schema.ts` (CLI-generated)
- Modify: `api/src/db/schema.ts` (re-export auth tables; add `patients.userId`)

**Interfaces:**
- Consumes: `auth` config from Task 1 (the CLI reads it to know which tables/columns to emit).
- Produces: Drizzle tables `user`, `session`, `account`, `verification` exported from `api/src/db/schema.ts`, plus `patients.userId: text("user_id")` (nullable, unique, FK → `user.id`, on delete set null). Task 3 queries `patients.userId`.

- [ ] **Step 1: Generate the better-auth schema**

```bash
cd api && bunx @better-auth/cli@latest generate --config src/lib/auth.ts --output src/db/auth-schema.ts -y
```

Expected output file: pgTable definitions for `user`, `session`, `account`, `verification` (shape as in better-auth's Drizzle docs — `user` has `id/name/email/emailVerified/image/createdAt/updatedAt`; `session` has `token/expiresAt/userId/...`; `account` holds the OAuth provider rows). If the CLI errors on config loading, fall back to copying the canonical schema from the better-auth Drizzle adapter docs (`docs/adapters/drizzle`) verbatim into `auth-schema.ts` — same table shapes.

- [ ] **Step 2: Wire into the main schema**

In `api/src/db/schema.ts` (top, near existing imports):

```ts
import { user } from "./auth-schema";

export * from "./auth-schema";
```

And add to the `patients` table column list:

```ts
  /** Auth identity (better-auth user). Null for demo/seed patients and pre-auth inductions. */
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
```

- [ ] **Step 3: Push and verify**

```bash
bun run db:push
/opt/homebrew/opt/postgresql@18/bin/psql -h localhost -d comunitas -c '\d "user"' -c '\d patients' | head -40
```

Expected: `user` table exists; `patients` has `user_id` column with unique constraint and FK.

- [ ] **Step 4: Confirm the seed leaves auth tables alone**

Run: `grep -n "truncate" -A 6 api/src/db/seed.ts`
Expected: the truncate list names only the domain tables (`event_rsvps … patients`) — no `user`/`session`/`account`/`verification`. (The `cascade` clause only reaches tables that FK *into* the truncated set; `user` does not, so accounts survive `db:reset`.) Then run `bun run db:seed` and re-check `select count(*) from "user"` is unchanged.

- [ ] **Step 5: Typecheck + commit**

```bash
bun run typecheck
git add api/src/db/auth-schema.ts api/src/db/schema.ts
git commit -m "feat: auth tables and patients.user_id link"
```

---

### Task 3: mount the handler + `/api/me` + `/api/me/claim`

**Files:**
- Create: `api/src/routes/me.ts`
- Modify: `api/src/index.ts` (mount auth handler + me routes)
- Modify: `api/src/types.ts` and `web/src/lib/types.ts` (add `MeResponse` — both files, manual-sync rule)

**Interfaces:**
- Consumes: `auth` (Task 1), `patients.userId` (Task 2).
- Produces:
  - `GET /api/me` → `MeResponse = { user: { id: string; name: string; email: string } | null; patientId: string | null }`
  - `POST /api/me/claim` body `{ patientId: string }` → `MeResponse` (or `401 { error }` unauthenticated, `409 { error }` patient already claimed by another user)
  - `ALL /api/auth/*` → better-auth (sign-in redirects, callback, session, sign-out).

- [ ] **Step 1: Mount the auth handler in `api/src/index.ts`**

After the CORS middleware and health route, before the other `app.route(...)` mounts:

```ts
import { auth } from "./lib/auth";
import { meRoutes } from "./routes/me";
```

```ts
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/me", meRoutes);
```

(No CORS change needed: every browser path — localhost and tailscale — goes through the Vite proxy, so requests are same-origin and cookies flow without `credentials` handling.)

- [ ] **Step 2: Create `api/src/routes/me.ts`**

```ts
import { eq, and, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { patients } from "../db/schema";
import { auth } from "../lib/auth";
import type { MeResponse } from "../types";

export const meRoutes = new Hono();

async function sessionUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
}

async function linkedPatientId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Who am I? Session → auth user → linked patient (null when not yet inducted/claimed). */
meRoutes.get("/", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  if (!user) return c.json<MeResponse>({ user: null, patientId: null });
  return c.json<MeResponse>({
    user: { id: user.id, name: user.name, email: user.email },
    patientId: await linkedPatientId(user.id),
  });
});

/**
 * Attach an unclaimed patient (fresh induction, or a pre-auth localStorage id)
 * to the signed-in user. First-writer-wins: a patient already linked to a
 * different user is a 409, not a steal.
 */
meRoutes.post("/claim", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  if (!user) return c.json({ error: "not signed in" }, 401);
  const { patientId } = await c.req.json<{ patientId?: string }>();
  if (!patientId) return c.json({ error: "patientId required" }, 400);

  const already = await linkedPatientId(user.id);
  if (!already) {
    const updated = await db
      .update(patients)
      .set({ userId: user.id })
      .where(and(eq(patients.id, patientId), isNull(patients.userId)))
      .returning({ id: patients.id });
    if (updated.length === 0) return c.json({ error: "patient not found or already claimed" }, 409);
  }
  return c.json<MeResponse>({
    user: { id: user.id, name: user.name, email: user.email },
    patientId: await linkedPatientId(user.id),
  });
});
```

- [ ] **Step 3: Add `MeResponse` to both type files**

In `api/src/types.ts` and (identically) `web/src/lib/types.ts`:

```ts
/** GET /api/me — session identity and its linked patient, both null-able. */
export interface MeResponse {
  user: { id: string; name: string; email: string } | null;
  patientId: string | null;
}
```

- [ ] **Step 4: Smoke test with curl**

With the dev servers running:

```bash
curl -s http://localhost:3001/api/me                      # → {"user":null,"patientId":null}
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3001/api/me/claim -H 'content-type: application/json' -d '{"patientId":"x"}'   # → 401
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3001/api/auth/session"  # → 200 (better-auth mounted)
```

- [ ] **Step 5: Typecheck + commit**

```bash
bun run typecheck
git add api/src/index.ts api/src/routes/me.ts api/src/types.ts web/src/lib/types.ts
git commit -m "feat: mount better-auth handler; /api/me and /api/me/claim"
```

---

### Task 4: web client — Google button, session → patient resolution, sign-out

**Files:**
- Create: `web/src/lib/auth.ts`
- Modify: `web/src/lib/api.ts` (add `getMe`, `claimPatient`)
- Modify: `web/src/pages/Welcome.tsx` (Google button + post-redirect resolution)
- Modify: `web/src/pages/Profile.tsx` (sign-out row when a session exists)
- Modify: `README.md` (app-surface blurb: sign-in exists, demo unaffected)

**Interfaces:**
- Consumes: `MeResponse`, `GET /api/me`, `POST /api/me/claim` (Task 3); `setCurrentPatientId`/`getCurrentPatientId`/`clearCurrentPatient` from `web/src/lib/patient.ts` (existing).
- Produces: `authClient` with `authClient.signIn.social({ provider, callbackURL })`, `authClient.signOut()`, `authClient.useSession()` — used only within these two pages.

- [ ] **Step 1: Install and create the client**

```bash
cd web && bun add better-auth
```

`web/src/lib/auth.ts`:

```ts
import { createAuthClient } from "better-auth/react";

/**
 * Same-origin through the Vite proxy — cookies are first-party on whichever
 * origin the app is opened from (localhost or the tailscale HTTPS hostname).
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});
```

- [ ] **Step 2: Add API helpers to `web/src/lib/api.ts`** (match the existing `request<T>` style used by `getDemo`/`getPatient`):

```ts
/** Session identity and linked patient; both null when signed out / unclaimed. */
export const getMe = () => request<MeResponse>("/me");

/** Link a freshly-inducted or pre-auth patient to the signed-in user. */
export const claimPatient = (patientId: string) =>
  request<MeResponse>("/me/claim", { method: "POST", body: JSON.stringify({ patientId }) });
```

(Add `MeResponse` to the type imports at the top; it exists in `web/src/lib/types.ts` from Task 3. If `request` doesn't set `content-type` on bodied posts, follow whatever the existing POST helpers like the RSVP call do.)

- [ ] **Step 3: Welcome.tsx — button + arrival resolution**

Two additions, keeping the page's existing structure and button components:

(a) A "Continue with Google" secondary button between "Start your induction" and the demo button:

```tsx
async function continueWithGoogle() {
  setError(null);
  try {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  } catch {
    setError("Google sign-in isn't configured. Set GOOGLE_CLIENT_ID in .env (see README).");
  }
}
```

```tsx
<Button variant="secondary" size="lg" fullWidth onClick={continueWithGoogle}>
  <LogIn size={22} aria-hidden />
  Continue with Google
</Button>
```

(`LogIn` from `lucide-react`, same import line as the other icons.)

(b) An on-mount effect that resolves a session after the OAuth redirect lands back on `/`:

```tsx
useEffect(() => {
  (async () => {
    try {
      const me = await getMe();
      if (!me.user) return; // signed out — normal welcome screen
      if (me.patientId) {
        setCurrentPatientId(me.patientId);
        navigate("/home", { replace: true });
        return;
      }
      // Signed in but no patient yet: adopt a pre-auth localStorage patient, else induct.
      const localId = getCurrentPatientId();
      if (localId) {
        const claimed = await claimPatient(localId).catch(() => null);
        if (claimed?.patientId) {
          setCurrentPatientId(claimed.patientId);
          navigate("/home", { replace: true });
          return;
        }
      }
      navigate("/induction", { replace: true });
    } catch {
      // API down — welcome screen already handles that via the demo button's error path.
    }
  })();
}, [navigate]);
```

- [ ] **Step 4: Profile.tsx — sign-out**

Read the current Profile page first and match its section/row components. Behavior: render a "Sign out" row only when `authClient.useSession().data` is truthy; on tap:

```tsx
const { data: session } = authClient.useSession();

async function signOut() {
  await authClient.signOut();
  clearCurrentPatient();
  navigate("/", { replace: true });
}
```

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`. Expected: both workspaces pass.

- [ ] **Step 6: Browser QA (needs Google credentials in `.env`, servers restarted)**

Playwright-or-manual, on `http://localhost:5173`:
1. Welcome → "Continue with Google" → Google consent → redirected back → lands on `/induction` (new user, no patient).
2. Complete a short induction (or text-mode `/induction?mode=text`) → pod reveal → from Welcome again: now lands on `/home` (claim linked the patient).
3. Profile → "Sign out" → back on Welcome; "Continue as Priya (demo)" still works signed-out.
4. `bun run db:reset`, then revisit: signed-in session survives, `/api/me` returns `patientId: null`, app routes to induction rather than crashing.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/auth.ts web/src/lib/api.ts web/src/pages/Welcome.tsx web/src/pages/Profile.tsx README.md web/package.json bun.lock
git commit -m "feat: Google sign-in on welcome screen with patient claim flow"
```

---

### Task 5 (deferred until the user has an Apple Developer account): Sign in with Apple

**Blocked on:** Apple Developer Program membership ($99/yr), creating an App ID + Services ID + Sign in with Apple key in the Apple Developer portal. Return URL to register: `<BETTER_AUTH_URL>/api/auth/callback/apple`. Note Apple **requires HTTPS** return URLs — only the tailscale origin qualifies in dev; localhost testing needs the tailscale URL as `BETTER_AUTH_URL`.

**Files:**
- Modify: `api/src/lib/auth.ts`, `api/src/env.ts`, `.env.example`, `web/src/pages/Welcome.tsx`, `README.md`

**Interfaces:** Consumes the Task 1 `auth` config shape; produces no new API surface (same `/api/auth/*` + `/api/me` flow as Google).

- [ ] **Step 1: Env plumbing** — add to `api/src/env.ts` + `.env.example`: `APPLE_CLIENT_ID` (the Services ID, e.g. `com.example.comunitas.web`), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the `.p8` contents, `\n`-escaped).

- [ ] **Step 2: Provider config** — in `api/src/lib/auth.ts`, `bun add jose` (api workspace) and extend the config. Apple's "client secret" is a self-signed ES256 JWT, max 6 months:

```ts
import { importPKCS8, SignJWT } from "jose";

async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}
```

Add `apple` to `socialProviders` (same conditional-on-env pattern as Google) with `clientId: env.APPLE_CLIENT_ID, clientSecret: await appleClientSecret()`, and append `"https://appleid.apple.com"` to `trustedOrigins` (Apple POSTs the callback cross-origin).

- [ ] **Step 3: Welcome button** — duplicate the Google button with `provider: "apple"` and an Apple icon; render each provider button only when configured (expose which providers are live via a tiny `GET /api/me/providers` or simply always render and rely on the error copy, matching whatever Task 4 shipped for unconfigured Google).

- [ ] **Step 4: Verify** — typecheck; sign-in round-trip from the tailscale HTTPS origin on the iPhone.

- [ ] **Step 5: Commit** — `feat: sign in with Apple`.

---

## Self-Review Notes

- **Spec coverage:** sign in with Google ✓ (Tasks 1–4), Apple ✓ (Task 5, explicitly gated on the paid account), users stored in own Postgres ✓ (Task 2), demo flows preserved ✓ (global constraint + Task 4 QA step 3), works over tailscale HTTPS ✓ (trustedOrigins/BETTER_AUTH_URL + redirect URI list).
- **Type consistency:** `MeResponse` defined once in Task 3 and imported in Task 4; `auth.handler` / `auth.api.getSession` usage in Task 3 matches the Task 1 "Produces" block; `patients.userId` produced in Task 2, consumed in Task 3.
- **Known judgment calls:** no route-level auth gating (anonymous access stays valid product behavior for the demo); `basePath`/`baseURL` split assumes better-auth ≥1.3 semantics — if the installed version derives the path purely from `baseURL`, set `baseURL: env.BETTER_AUTH_URL + "/api/auth"` instead and drop `basePath` (check the installed version's docs at implementation time).
