/**
 * Shared API payload types.
 *
 * This file is the single source of truth for the shapes crossing the wire.
 * `web/src/lib/types.ts` mirrors it verbatim — keep the two in sync by hand.
 */

/* ------------------------------------------------------------------ enums */

export type AgeBand = "18-29" | "30-44" | "45-59" | "60-74" | "75+";
export type TransportMode = "walk" | "cycle" | "bus" | "tube" | "car";
export type InductionStatus = "pending" | "in_progress" | "complete";
export type PodStatus = "forming" | "active";
export type EventStatus = "proposed" | "confirmed" | "completed" | "cancelled";
export type EventSource = "discovered" | "adhoc";
export type RsvpStatus = "yes" | "no" | "maybe";
export type InductionSessionStatus = "active" | "complete" | "abandoned";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TimeSlot = "morning" | "afternoon" | "evening";
/** e.g. `{ mon: ["morning"], sat: ["morning", "afternoon"] }` */
export type Availability = Partial<Record<DayKey, TimeSlot[]>>;

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const TIME_SLOTS: TimeSlot[] = ["morning", "afternoon", "evening"];

/* ------------------------------------------------------------ primitives */

/** Every non-2xx response from the API has this shape. */
export interface ApiError {
  error: string;
}

/** Enumerable profile fact: a slug plus optional free-text colour. */
export interface Tag {
  slug: string;
  note?: string | null;
}

export interface TranscriptEntry {
  role: "user" | "assistant" | "system";
  text: string;
  at: string;
}

/* --------------------------------------------------------------- patient */

export interface PodSummary {
  id: string;
  name: string;
  status: PodStatus;
  description: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
  memberCount?: number;
}

export interface Patient {
  id: string;
  name: string | null;
  ageBand: AgeBand | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  travelRadiusKm: number;
  transportModes: TransportMode[];
  mobilityNotes: string | null;
  confidenceLevel: number | null;
  fitnessLevel: number | null;
  fitnessNotes: string | null;
  availability: Availability;
  inductionStatus: InductionStatus;
  createdAt: string;
}

export interface PatientProfile extends Patient {
  conditions: Tag[];
  goals: Tag[];
  interests: Tag[];
  pod: PodSummary | null;
}

/** Body of `PATCH /api/patients/:id/profile` — also the `update_profile` tool schema. */
export interface UpdateProfileBody {
  name?: string | null;
  ageBand?: AgeBand | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  travelRadiusKm?: number;
  transportModes?: TransportMode[];
  mobilityNotes?: string | null;
  confidenceLevel?: number | null;
  fitnessLevel?: number | null;
  fitnessNotes?: string | null;
  availability?: Availability;
  /** Full-array replace, not a merge. */
  conditions?: Tag[];
  goals?: Tag[];
  interests?: Tag[];
}

export interface UpdateProfileResponse {
  patient: PatientProfile;
  /** Set when a postcode was supplied but postcodes.io could not resolve it. */
  warning?: string;
}

export interface CompleteInductionResponse {
  patient: PatientProfile;
  pod: PodSummary | null;
  /** Straight-line km from the patient to the assigned pod centroid. */
  distanceKm: number | null;
}

/* ------------------------------------------------------------------- pod */

/** Deliberately no health data about other members. */
export interface PodMember {
  patientId: string;
  firstName: string;
  interests: string[];
  joinedAt: string;
}

export interface PodDetail extends PodSummary {
  members: PodMember[];
  memberCount: number;
  /** Interest slugs held by two or more members, most common first. */
  sharedInterests: string[];
  createdAt: string;
}

/* ---------------------------------------------------------------- events */

export interface EventSummary {
  id: string;
  podId: string;
  podName: string | null;
  title: string;
  description: string | null;
  activityType: string;
  venueName: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  source: EventSource;
}

export interface EventWithRsvp extends EventSummary {
  myRsvp: RsvpStatus | null;
  attended: boolean | null;
  rsvpCounts: RsvpCounts;
}

export interface RsvpCounts {
  yes: number;
  no: number;
  maybe: number;
}

export interface EventDetail extends EventSummary {
  rsvpCounts: RsvpCounts;
  /** First names of members who said yes. */
  going: string[];
  myRsvp: RsvpStatus | null;
  attended: boolean | null;
}

export interface RsvpBody {
  patientId: string;
  status: RsvpStatus;
}

export interface RsvpResponse {
  eventId: string;
  patientId: string;
  status: RsvpStatus;
  rsvpCounts: RsvpCounts;
}

/* --------------------------------------------------------------- history */

export interface HistoryEntry extends EventSummary {
  attended: boolean;
  myRsvp: RsvpStatus | null;
}

export interface HistoryResponse {
  events: HistoryEntry[];
  /** Consecutive weeks (Mon-start) with at least one attendance, counting back from now. */
  currentStreak: number;
  bestStreak: number;
  attendedCount: number;
  totalCount: number;
  /** attendedCount / totalCount, 0–1, rounded to 2dp. */
  adherence: number;
}

/* ------------------------------------------------------------------- map */

export interface MapMember {
  patientId: string;
  firstName: string;
  /** Jittered to ~postcode-level precision; never an exact home address. */
  lat: number | null;
  lng: number | null;
}

export interface MapResponse {
  patient: {
    id: string;
    lat: number | null;
    lng: number | null;
    postcode: string | null;
    travelRadiusKm: number;
  };
  pod: PodSummary | null;
  members: MapMember[];
  events: EventSummary[];
}

/* ------------------------------------------------------------- induction */

export interface RealtimeSessionBody {
  patientId?: string;
}

export interface RealtimeSessionResponse {
  value: string;
  expiresAt: number;
  patientId: string;
  sessionId: string;
}

export interface TranscriptBody {
  entries: TranscriptEntry[];
}

export interface TranscriptResponse {
  sessionId: string;
  status: InductionSessionStatus;
  entryCount: number;
}

/* ------------------------------------------------------------------ demo */

export interface DemoResponse {
  patientId: string;
  name: string | null;
  podId: string | null;
}
