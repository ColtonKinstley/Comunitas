import { config } from "dotenv";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/**
 * Env lives at the repo root (`.env`, gitignored). Resolve it relative to this
 * file rather than `process.cwd()` so it loads the same whether a script is run
 * from the repo root, from `api/`, or by drizzle-kit.
 */
const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

// `dotenv` never overwrites vars already present in `process.env`, so anything
// exported in the user's shell (e.g. OPENAI_API_KEY) wins over the file.
config({ path: [resolve(repoRoot, ".env"), resolve(repoRoot, "api/.env")], quiet: true });

const defaultDatabaseUrl = `postgresql://${userInfo().username}@localhost:5432/comunitas`;

export const env = {
  DATABASE_URL: process.env.DATABASE_URL?.trim() || defaultDatabaseUrl,
  /** Empty in local dev until the user exports one; realtime routes must degrade gracefully. */
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || "",
  PORT: Number(process.env.PORT ?? 3001),
  HOST: process.env.HOST?.trim() || "0.0.0.0",
  /** Origin the app is served from; better-auth derives OAuth callback URLs from it. */
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL?.trim() || "http://localhost:5173",
  /** Required in practice for sign-in; empty default keeps demo flows bootable. */
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET?.trim() || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim() || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
} as const;
