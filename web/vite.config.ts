import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Two pages ship from this workspace: the static landing page (`index.html`,
 * served at `/`) and the React app (`app.html`, which owns every other route).
 * In production `web/vercel.json` rewrites non-file paths to `/app.html`; this
 * plugin is the dev-server equivalent, since Vite's built-in SPA fallback only
 * knows about `index.html`.
 */
function appHtmlFallback(): Plugin {
  return {
    name: "app-html-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const isAppRoute =
          req.method === "GET" &&
          path !== "/" &&
          !path.startsWith("/api") &&
          !path.startsWith("/@") && // vite internals (/@vite, /@fs, /@react-refresh)
          !path.includes("."); // files: assets, source modules, favicons
        if (isAppRoute) req.url = "/app.html";
        next();
      });
    },
  };
}

// Overridable so a second checkout (e.g. a git worktree) can run alongside the
// main dev servers without fighting over ports.
const port = Number(process.env.WEB_PORT ?? 5173);
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

export default defineConfig({
  plugins: [react(), tailwindcss(), appHtmlFallback()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app.html"),
      },
    },
  },
  server: {
    // 0.0.0.0 so the phone-frame demo can be opened from another device on the LAN.
    host: "0.0.0.0",
    port,
    strictPort: true,
    // Accessed over Tailscale by hostname (e.g. http://macmini:5173).
    allowedHosts: [".ts.net", "macmini"],
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: { host: "0.0.0.0", port },
});
