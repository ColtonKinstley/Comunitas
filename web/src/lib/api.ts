/**
 * Typed client for every endpoint in the Comunitas API.
 *
 * Requests go to the relative `/api` path — Vite proxies that to
 * http://localhost:3001 in dev, so there is no base URL to configure.
 */
import type {
  ApiError as ApiErrorBody,
  CompleteInductionResponse,
  CompleteLessonBody,
  CompleteLessonResponse,
  DemoResponse,
  EventDetail,
  EventStatus,
  EventWithRsvp,
  HistoryResponse,
  InductionSessionStatus,
  LearnProgressResponse,
  MapResponse,
  MeResponse,
  PatientProfile,
  PodDetail,
  PodSummary,
  RealtimeSessionBody,
  RealtimeSessionResponse,
  RsvpBody,
  RsvpResponse,
  TranscriptEntry,
  TranscriptResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "./types";
import { clearCurrentPatient } from "./patient";

const BASE = "/api";

/**
 * Requests scoped to one patient — `/patients/<id>` and everything under it.
 * Deliberately narrow: a 404 from `/events/<id>` means "no such activity", not
 * "you don't exist", and must never sign anyone out.
 */
const PATIENT_SCOPED = /^\/patients\/[^/?#]+(?:[/?#]|$)/;

/**
 * The stored patient id is the app's whole notion of identity, and a database
 * reset leaves a stale one behind that 404s on every screen with no way out.
 * When the patient themselves is gone, forget them and start again at welcome.
 */
function forgetMissingPatient(path: string): void {
  if (!PATIENT_SCOPED.test(path)) return;
  clearCurrentPatient();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.replace("/");
  }
}

/** Thrown for any non-2xx response; `message` is the API's `{ error }` string. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Could not reach the Comunitas API. Is it running on port 3001?");
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    if (res.status === 404) forgetMissingPatient(path);
    const message = (data as ApiErrorBody | null)?.error ?? res.statusText ?? "Request failed";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

/* -------------------------------------------------------------- health */

export const getHealth = () => request<{ ok: boolean; service: string }>("/health");

/* ---------------------------------------------------------------- demo */

/** `{ patientId }` for the seeded demo patient (Priya Shah). */
export const getDemo = () => request<DemoResponse>("/demo");

/* ------------------------------------------------------------------ me */

/** Session identity and linked patient; both null when signed out / unclaimed. */
export const getMe = () => request<MeResponse>("/me");

/** Link a freshly-inducted or pre-auth patient to the signed-in user. */
export const claimPatient = (patientId: string) =>
  request<MeResponse>("/me/claim", { method: "POST", body: JSON.stringify({ patientId }) });

/* ------------------------------------------------------------ realtime */

/**
 * Mints an ephemeral OpenAI Realtime client secret and, when no `patientId` is
 * given, creates the patient + induction session. Returns 501 until the voice
 * work stream lands.
 */
export const createRealtimeSession = (body: RealtimeSessionBody = {}) =>
  request<RealtimeSessionResponse>("/realtime/session", {
    method: "POST",
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------ patients */

export const getPatient = (patientId: string) =>
  request<PatientProfile>(`/patients/${patientId}`);

/** Partial update. `conditions`/`goals`/`interests` replace the whole array. */
export const updateProfile = (patientId: string, body: UpdateProfileBody) =>
  request<UpdateProfileResponse>(`/patients/${patientId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

/** Marks the induction complete and assigns the nearest suitable pod. */
export const completeInduction = (patientId: string) =>
  request<CompleteInductionResponse>(`/patients/${patientId}/complete-induction`, {
    method: "POST",
  });

export interface EventsQuery {
  /** ISO datetime — only events starting at or after this. */
  from?: string;
  /** ISO datetime — only events starting at or before this. */
  to?: string;
  /** One status, or several comma-separated. */
  status?: EventStatus | string;
}

export const getPatientEvents = (patientId: string, query: EventsQuery = {}) =>
  request<EventWithRsvp[]>(`/patients/${patientId}/events${qs({ ...query })}`);

export const getPatientHistory = (patientId: string) =>
  request<HistoryResponse>(`/patients/${patientId}/history`);

export const getPatientMap = (patientId: string) =>
  request<MapResponse>(`/patients/${patientId}/map`);

/* --------------------------------------------------------------- learn */

/** Every lesson this patient has completed, oldest first. */
export const getLearnProgress = (patientId: string) =>
  request<LearnProgressResponse>(`/patients/${patientId}/learn`);

/** Records (or refreshes) a lesson completion; upserts on the lesson slug. */
export const completeLesson = (patientId: string, lessonId: string, body: CompleteLessonBody) =>
  request<CompleteLessonResponse>(`/patients/${patientId}/learn/${lessonId}/complete`, {
    method: "POST",
    body: JSON.stringify(body),
  });

/* ---------------------------------------------------------------- pods */

export const getPod = (podId: string) => request<PodDetail>(`/pods/${podId}`);

export const listPods = () => request<PodSummary[]>("/pods");

/* -------------------------------------------------------------- events */

export const getEvent = (eventId: string, patientId?: string) =>
  request<EventDetail>(`/events/${eventId}${qs({ patientId })}`);

export const rsvp = (eventId: string, body: RsvpBody) =>
  request<RsvpResponse>(`/events/${eventId}/rsvp`, {
    method: "POST",
    body: JSON.stringify(body),
  });

/* ----------------------------------------------------------- induction */

export const appendTranscript = (
  sessionId: string,
  entries: TranscriptEntry[],
  status?: InductionSessionStatus,
) =>
  request<TranscriptResponse>(`/induction/${sessionId}/transcript`, {
    method: "POST",
    body: JSON.stringify({ entries, ...(status ? { status } : {}) }),
  });

export const getInductionSession = (sessionId: string) =>
  request<{
    id: string;
    patientId: string;
    status: InductionSessionStatus;
    transcript: TranscriptEntry[];
    createdAt: string;
  }>(`/induction/${sessionId}`);
