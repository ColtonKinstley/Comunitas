import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { env } from "./env";
import { demoRoutes } from "./routes/demo";
import { eventsRoutes } from "./routes/events";
import { inductionRoutes } from "./routes/induction";
import { patientsRoutes } from "./routes/patients";
import { podsRoutes } from "./routes/pods";
import { realtimeRoutes } from "./routes/realtime";
import type { ApiError } from "./types";

const app = new Hono();

app.use("*", logger());

/**
 * The Vite dev server proxies `/api`, so browsers usually send same-origin
 * requests. CORS still matters when the app is opened over the LAN (both
 * servers bind 0.0.0.0), so allow any `:5173` origin plus localhost.
 */
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "http://localhost:5173";
      if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return origin;
      if (/:5173$/.test(origin)) return origin;
      return "http://localhost:5173";
    },
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "comunitas-api" }));

app.route("/api/demo", demoRoutes);
app.route("/api/realtime", realtimeRoutes);
app.route("/api/patients", patientsRoutes);
app.route("/api/pods", podsRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/induction", inductionRoutes);

app.notFound((c) => c.json<ApiError>({ error: "not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // `fail()` already carries a JSON `{ error }` response.
    const res = err.getResponse();
    if (res.headers.get("content-type")?.includes("application/json")) return res;
    return c.json<ApiError>({ error: err.message || "request failed" }, err.status);
  }
  console.error("[api] unhandled error", err);
  return c.json<ApiError>({ error: "internal server error" }, 500);
});

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};

console.log(`[api] comunitas api listening on http://${env.HOST}:${env.PORT}`);
