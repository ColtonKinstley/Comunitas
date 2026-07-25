import type { PodSummary, UpdateProfileBody } from "../../lib/types";

/** Where the induction is in its lifecycle. Drives which screen renders. */
export type Phase =
  | "intro"
  | "permission"
  | "connecting"
  | "live"
  | "completing"
  | "complete"
  | "error";

/** `voice` uses the microphone; `text` is the typed fallback (and headless QA). */
export type Mode = "voice" | "text";

export interface Caption {
  /** Realtime item id — deltas for the same item append to one bubble. */
  id: string;
  role: "user" | "assistant";
  text: string;
  /** False while the model or the transcriber is still streaming it. */
  final: boolean;
}

/**
 * Everything the interviewer has learned so far, mirrored into the live
 * profile card. `version` bumps per field so the card can re-run its
 * fade-in animation only on the fields that actually changed.
 */
export interface ProfileState {
  draft: UpdateProfileBody & { lat?: number | null; lng?: number | null };
  versions: Record<string, number>;
}

export interface CompletionResult {
  pod: PodSummary | null;
  distanceKm: number | null;
  patientName: string | null;
}

/** Which fields the interviewer still needs before it may finish. */
export const COVERAGE_FIELDS = [
  "location",
  "conditions",
  "goals",
  "fitness",
  "interests",
  "availability",
  "constraints",
] as const;
