import { createAuthClient } from "better-auth/react";

/**
 * Same-origin through the Vite proxy — cookies are first-party on whichever
 * origin the app is opened from (localhost or the tailscale HTTPS hostname).
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});
