import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Overridable so a second checkout (e.g. a git worktree) can run alongside the
// main dev servers without fighting over ports.
const port = Number(process.env.WEB_PORT ?? 5173);
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 0.0.0.0 so the phone-frame demo can be opened from another device on the LAN.
    host: "0.0.0.0",
    port,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: { host: "0.0.0.0", port },
});
