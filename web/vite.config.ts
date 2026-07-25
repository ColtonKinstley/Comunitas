import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 0.0.0.0 so the phone-frame demo can be opened from another device on the LAN.
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Accessed over Tailscale by hostname (e.g. http://macmini:5173).
    allowedHosts: [".ts.net", "macmini"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: { host: "0.0.0.0", port: 5173 },
});
