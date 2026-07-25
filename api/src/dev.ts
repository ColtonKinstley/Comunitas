/**
 * Local entrypoint: Bun reads this default export as its serve config.
 * Production (Vercel) imports `src/index.ts` directly and ignores this file.
 */
import { env } from "./env.js";
import app from "./index.js";

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};

console.log(`[api] comunitas api listening on http://${env.HOST}:${env.PORT}`);
