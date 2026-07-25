import { Hono } from "hono";
import type { ApiError } from "../types";

/**
 * Voice induction session minting — owned by the realtime/voice work stream.
 *
 * Contract (do not change without updating `web/src/lib/api.ts` and
 * `api/src/types.ts`):
 *
 *   POST /api/realtime/session
 *   body:     { patientId?: string }   // resume an in-progress induction
 *   200:      { value, expiresAt, patientId, sessionId }
 *
 * The implementation must: create a `patients` row (`induction_status:
 * "in_progress"`) plus an `induction_sessions` row when no `patientId` is
 * supplied, then mint an ephemeral client secret from
 * `POST https://api.openai.com/v1/realtime/client_secrets` for model
 * `gpt-realtime-2.1`, with the interviewer persona and the `update_profile` /
 * `complete_induction` tools baked into the session config.
 */
export const realtimeRoutes = new Hono();

realtimeRoutes.post("/session", (c) =>
  c.json<ApiError>({ error: "not implemented" }, 501),
);
