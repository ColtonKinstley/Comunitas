import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { env } from "../env.js";

// Half-configured Google credentials fail late (and opaquely) at the token
// exchange step rather than at boot — warn up front so it's obvious why.
if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    "[auth] GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is empty — Google sign-in will fail at token exchange.",
  );
}

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
  // Health app — pin phone-home off explicitly rather than relying on defaults.
  telemetry: { enabled: false },
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
