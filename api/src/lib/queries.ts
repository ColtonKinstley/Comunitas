import { and, count, eq, inArray, sql as raw } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  eventRsvps,
  events,
  patientConditions,
  patientGoals,
  patientInterests,
  patients,
  podMembers,
  pods,
} from "../db/schema.js";
import type {
  EventSummary,
  PatientProfile,
  PodDetail,
  PodMember,
  PodSummary,
  RsvpCounts,
  Tag,
} from "../types.js";
import type { MatchCandidate, MatchPod } from "./matching.js";
import type { EventRow, PatientRow, PodRow } from "../db/schema.js";

export const firstName = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] || "Someone";

export const iso = (d: Date | string | null) =>
  d === null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString();

export function toPodSummary(pod: PodRow, memberCount?: number): PodSummary {
  return {
    id: pod.id,
    name: pod.name,
    status: pod.status,
    description: pod.description,
    centroidLat: pod.centroidLat,
    centroidLng: pod.centroidLng,
    ...(memberCount === undefined ? {} : { memberCount }),
  };
}

export function toEventSummary(row: EventRow, podName: string | null = null): EventSummary {
  return {
    id: row.id,
    podId: row.podId,
    podName,
    title: row.title,
    description: row.description,
    activityType: row.activityType,
    venueName: row.venueName,
    lat: row.lat,
    lng: row.lng,
    startsAt: iso(row.startsAt)!,
    endsAt: iso(row.endsAt),
    status: row.status,
    source: row.source,
  };
}

export const emptyCounts = (): RsvpCounts => ({ yes: 0, no: 0, maybe: 0 });

/** Tally RSVP rows into `{yes,no,maybe}` buckets keyed by event id. */
export function tallyRsvps(rows: { eventId: string; status: "yes" | "no" | "maybe" }[]) {
  const byEvent = new Map<string, RsvpCounts>();
  for (const row of rows) {
    const counts = byEvent.get(row.eventId) ?? emptyCounts();
    counts[row.status] += 1;
    byEvent.set(row.eventId, counts);
  }
  return byEvent;
}

export async function getPatientRow(id: string): Promise<PatientRow | null> {
  const [row] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return row ?? null;
}

/** The pod a patient belongs to, or null while they are unmatched. */
export async function getPatientPod(patientId: string): Promise<PodSummary | null> {
  const [row] = await db
    .select({ pod: pods })
    .from(podMembers)
    .innerJoin(pods, eq(pods.id, podMembers.podId))
    .where(eq(podMembers.patientId, patientId))
    .limit(1);
  if (!row) return null;

  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(podMembers)
    .where(eq(podMembers.podId, row.pod.id));
  return toPodSummary(row.pod, Number(n));
}

/** Full patient profile with conditions/goals/interests and pod, per the spec. */
export async function loadPatientProfile(id: string): Promise<PatientProfile | null> {
  const patient = await getPatientRow(id);
  if (!patient) return null;

  const [conditionRows, goalRows, interestRows, pod] = await Promise.all([
    db.select().from(patientConditions).where(eq(patientConditions.patientId, id)),
    db.select().from(patientGoals).where(eq(patientGoals.patientId, id)),
    db.select().from(patientInterests).where(eq(patientInterests.patientId, id)),
    getPatientPod(id),
  ]);

  const tag = (slug: string, note: string | null): Tag => ({ slug, note });

  return {
    id: patient.id,
    name: patient.name,
    ageBand: patient.ageBand,
    postcode: patient.postcode,
    lat: patient.lat,
    lng: patient.lng,
    travelRadiusKm: patient.travelRadiusKm,
    transportModes: patient.transportModes ?? [],
    mobilityNotes: patient.mobilityNotes,
    confidenceLevel: patient.confidenceLevel,
    fitnessLevel: patient.fitnessLevel,
    fitnessNotes: patient.fitnessNotes,
    availability: patient.availability ?? {},
    inductionStatus: patient.inductionStatus,
    createdAt: iso(patient.createdAt)!,
    conditions: conditionRows.map((r) => tag(r.condition, r.note)),
    goals: goalRows.map((r) => tag(r.goal, r.note)),
    interests: interestRows.map((r) => tag(r.interest, r.note)),
    pod,
  };
}

/** Pod + members. Interests only — never other members' health data. */
export async function loadPodDetail(podId: string): Promise<PodDetail | null> {
  const [pod] = await db.select().from(pods).where(eq(pods.id, podId)).limit(1);
  if (!pod) return null;

  const memberRows = await db
    .select({
      patientId: patients.id,
      name: patients.name,
      joinedAt: podMembers.joinedAt,
    })
    .from(podMembers)
    .innerJoin(patients, eq(patients.id, podMembers.patientId))
    .where(eq(podMembers.podId, podId))
    .orderBy(podMembers.joinedAt);

  const ids = memberRows.map((m) => m.patientId);
  const interestRows = ids.length
    ? await db
        .select()
        .from(patientInterests)
        .where(inArray(patientInterests.patientId, ids))
    : [];

  const byPatient = new Map<string, string[]>();
  const tally = new Map<string, number>();
  for (const row of interestRows) {
    byPatient.set(row.patientId, [...(byPatient.get(row.patientId) ?? []), row.interest]);
    tally.set(row.interest, (tally.get(row.interest) ?? 0) + 1);
  }

  const members: PodMember[] = memberRows.map((m) => ({
    patientId: m.patientId,
    firstName: firstName(m.name),
    interests: byPatient.get(m.patientId) ?? [],
    joinedAt: iso(m.joinedAt)!,
  }));

  const sharedInterests = [...tally.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug]) => slug);

  return {
    ...toPodSummary(pod, members.length),
    memberCount: members.length,
    members,
    sharedInterests,
    createdAt: iso(pod.createdAt)!,
  };
}

/* ---------------------------------------------------------- pod matching */

export interface MatchInputs {
  candidate: MatchCandidate;
  pods: MatchPod[];
  /** Full pod rows keyed by id, for shaping the response after a decision. */
  podRows: Map<string, PodRow>;
}

/**
 * Everything the pure matcher (`src/lib/matching.ts`) needs, in six round
 * trips regardless of pod or member count: pods, memberships, then the member
 * patient rows and all three tag tables batched with `inArray` — never a
 * per-member query. The inducting patient is excluded from member lists: a
 * re-run induction re-matches from scratch, so they must not count toward
 * their old pod's profile or size.
 */
export async function loadMatchInputs(patient: PatientRow): Promise<MatchInputs> {
  const [podRows, membershipRows] = await Promise.all([
    db.select().from(pods),
    db.select({ podId: podMembers.podId, patientId: podMembers.patientId }).from(podMembers),
  ]);

  const memberships = membershipRows.filter((m) => m.patientId !== patient.id);
  const memberIds = [...new Set(memberships.map((m) => m.patientId))];
  const allIds = [...memberIds, patient.id];

  const [memberRows, conditionRows, goalRows, interestRows] = await Promise.all([
    memberIds.length
      ? db.select().from(patients).where(inArray(patients.id, memberIds))
      : Promise.resolve([] as PatientRow[]),
    db.select().from(patientConditions).where(inArray(patientConditions.patientId, allIds)),
    db.select().from(patientGoals).where(inArray(patientGoals.patientId, allIds)),
    db.select().from(patientInterests).where(inArray(patientInterests.patientId, allIds)),
  ]);

  const push = (map: Map<string, string[]>, id: string, slug: string) =>
    map.set(id, [...(map.get(id) ?? []), slug]);
  const conditionsBy = new Map<string, string[]>();
  for (const r of conditionRows) push(conditionsBy, r.patientId, r.condition);
  const goalsBy = new Map<string, string[]>();
  for (const r of goalRows) push(goalsBy, r.patientId, r.goal);
  const interestsBy = new Map<string, string[]>();
  for (const r of interestRows) push(interestsBy, r.patientId, r.interest);

  const toCandidate = (row: PatientRow): MatchCandidate => ({
    lat: row.lat,
    lng: row.lng,
    travelRadiusKm: row.travelRadiusKm,
    fitnessLevel: row.fitnessLevel,
    conditions: conditionsBy.get(row.id) ?? [],
    goals: goalsBy.get(row.id) ?? [],
    interests: interestsBy.get(row.id) ?? [],
    availability: row.availability ?? {},
  });

  const rowById = new Map(memberRows.map((r) => [r.id, r] as const));
  const membersByPod = new Map<string, MatchCandidate[]>();
  for (const m of memberships) {
    const row = rowById.get(m.patientId);
    if (!row) continue;
    membersByPod.set(m.podId, [...(membersByPod.get(m.podId) ?? []), toCandidate(row)]);
  }

  return {
    candidate: toCandidate(patient),
    pods: podRows.map((p) => ({
      id: p.id,
      centroidLat: p.centroidLat,
      centroidLng: p.centroidLng,
      members: membersByPod.get(p.id) ?? [],
    })),
    podRows: new Map(podRows.map((p) => [p.id, p] as const)),
  };
}

/** RSVP counts for a set of events, in one round trip. */
export async function countRsvps(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, RsvpCounts>();
  const rows = await db
    .select({ eventId: eventRsvps.eventId, status: eventRsvps.status })
    .from(eventRsvps)
    .where(inArray(eventRsvps.eventId, eventIds));
  return tallyRsvps(rows);
}

/** This patient's own RSVP rows for a set of events. */
export async function myRsvpMap(patientId: string, eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, { status: "yes" | "no" | "maybe"; attended: boolean | null }>();
  const rows = await db
    .select({ eventId: eventRsvps.eventId, status: eventRsvps.status, attended: eventRsvps.attended })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.patientId, patientId), inArray(eventRsvps.eventId, eventIds)));
  return new Map(rows.map((r) => [r.eventId, { status: r.status, attended: r.attended }]));
}

/** Events belonging to a pod, ascending by start time. */
export async function podEventRows(podId: string) {
  return db
    .select({ event: events, podName: pods.name })
    .from(events)
    .innerJoin(pods, eq(pods.id, events.podId))
    .where(eq(events.podId, podId))
    .orderBy(raw`${events.startsAt} asc`);
}
