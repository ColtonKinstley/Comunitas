import { and, asc, eq, gte, inArray, lte, ne, notInArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  events,
  patientConditions,
  patientGoals,
  patientInterests,
  patients,
  podMembers,
  pods,
} from "../db/schema.js";
import { jitterCoord, roundKm } from "../lib/geo.js";
import { geocodePostcode } from "../lib/geocode.js";
import { fail, jsonBody, queryParams, requireUuid } from "../lib/http.js";
import { chooseBestPod } from "../lib/matching.js";
import {
  countRsvps,
  emptyCounts,
  firstName,
  getPatientRow,
  loadMatchInputs,
  loadPatientProfile,
  myRsvpMap,
  toEventSummary,
  toPodSummary,
} from "../lib/queries.js";
import { weeklyStreaks } from "../lib/streak.js";
import type {
  CompleteInductionResponse,
  EventWithRsvp,
  HistoryEntry,
  HistoryResponse,
  MapResponse,
  PatientProfile,
  UpdateProfileResponse,
} from "../types.js";

const AGE_BANDS = ["18-29", "30-44", "45-59", "60-74", "75+"] as const;
const TRANSPORT_MODES = ["walk", "cycle", "bus", "tube", "car"] as const;
const TIME_SLOTS = ["morning", "afternoon", "evening"] as const;
const EVENT_STATUSES = ["proposed", "confirmed", "completed", "cancelled"] as const;

const slot = z.enum(TIME_SLOTS);
const availabilitySchema = z.object({
  mon: z.array(slot).optional(),
  tue: z.array(slot).optional(),
  wed: z.array(slot).optional(),
  thu: z.array(slot).optional(),
  fri: z.array(slot).optional(),
  sat: z.array(slot).optional(),
  sun: z.array(slot).optional(),
});

const tagSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  note: z.string().max(500).nullish(),
});

/** Mirrors `UpdateProfileBody`; also the shape of the `update_profile` voice tool. */
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).nullish(),
    ageBand: z.enum(AGE_BANDS).nullish(),
    postcode: z.string().trim().min(2).max(12).nullish(),
    lat: z.number().min(-90).max(90).nullish(),
    lng: z.number().min(-180).max(180).nullish(),
    travelRadiusKm: z.number().int().min(1).max(50).optional(),
    transportModes: z.array(z.enum(TRANSPORT_MODES)).optional(),
    mobilityNotes: z.string().max(1000).nullish(),
    confidenceLevel: z.number().int().min(1).max(5).nullish(),
    fitnessLevel: z.number().int().min(1).max(5).nullish(),
    fitnessNotes: z.string().max(1000).nullish(),
    availability: availabilitySchema.optional(),
    conditions: z.array(tagSchema).optional(),
    goals: z.array(tagSchema).optional(),
    interests: z.array(tagSchema).optional(),
  })
  .strict();

const eventsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  /** Single status or comma-separated list. */
  status: z.string().optional(),
});

const parseDate = (value: string | undefined, label: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) fail(400, `${label} must be an ISO date`);
  return d;
};

const parseStatuses = (value: string | undefined) => {
  if (!value) return null;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (!(EVENT_STATUSES as readonly string[]).includes(p)) {
      fail(400, `status must be one of ${EVENT_STATUSES.join(", ")}`);
    }
  }
  return parts as (typeof EVENT_STATUSES)[number][];
};

/** Dedupe tags by slug, last write wins — the voice tool repeats itself. */
const dedupe = <T extends { slug: string }>(rows: T[]) => {
  const map = new Map<string, T>();
  for (const row of rows) map.set(row.slug.trim().toLowerCase(), row);
  return [...map.values()];
};

export const patientsRoutes = new Hono();

/* --------------------------------------------- GET /api/patients/:id */

patientsRoutes.get("/:id", async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const profile = await loadPatientProfile(id);
  if (!profile) fail(404, "patient not found");
  return c.json<PatientProfile>(profile);
});

/* ------------------------------- PATCH /api/patients/:id/profile */

patientsRoutes.patch("/:id/profile", jsonBody(updateProfileSchema), async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const existing = await getPatientRow(id);
  if (!existing) fail(404, "patient not found");

  const body = c.req.valid("json");
  const updates: Partial<typeof patients.$inferInsert> = {};
  let warning: string | undefined;

  if ("name" in body) updates.name = body.name ?? null;
  if ("ageBand" in body) updates.ageBand = body.ageBand ?? null;
  if ("travelRadiusKm" in body) updates.travelRadiusKm = body.travelRadiusKm;
  if ("transportModes" in body) updates.transportModes = body.transportModes;
  if ("mobilityNotes" in body) updates.mobilityNotes = body.mobilityNotes ?? null;
  if ("confidenceLevel" in body) updates.confidenceLevel = body.confidenceLevel ?? null;
  if ("fitnessLevel" in body) updates.fitnessLevel = body.fitnessLevel ?? null;
  if ("fitnessNotes" in body) updates.fitnessNotes = body.fitnessNotes ?? null;
  if ("availability" in body) updates.availability = body.availability;
  if ("lat" in body) updates.lat = body.lat ?? null;
  if ("lng" in body) updates.lng = body.lng ?? null;

  if ("postcode" in body) {
    const postcode = body.postcode?.trim() || null;
    updates.postcode = postcode;
    const coordsSupplied = typeof body.lat === "number" && typeof body.lng === "number";
    if (postcode && !coordsSupplied) {
      const geo = await geocodePostcode(postcode);
      if (geo) {
        updates.postcode = geo.postcode;
        updates.lat = geo.lat;
        updates.lng = geo.lng;
      } else {
        // Spec: keep the postcode, warn, carry on. Never block the induction.
        // Clear any previous coordinates rather than leaving them pointing at
        // the old postcode.
        updates.lat = null;
        updates.lng = null;
        warning = `Could not geocode postcode "${postcode}" — saved without coordinates`;
      }
    }
  }

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 0) {
      await tx.update(patients).set(updates).where(eq(patients.id, id));
    }

    // Enumerable facts are full-array replaces, not merges.
    if (body.conditions) {
      await tx.delete(patientConditions).where(eq(patientConditions.patientId, id));
      const rows = dedupe(body.conditions);
      if (rows.length) {
        await tx.insert(patientConditions).values(
          rows.map((t) => ({ patientId: id, condition: t.slug.trim(), note: t.note ?? null })),
        );
      }
    }
    if (body.goals) {
      await tx.delete(patientGoals).where(eq(patientGoals.patientId, id));
      const rows = dedupe(body.goals);
      if (rows.length) {
        await tx.insert(patientGoals).values(
          rows.map((t) => ({ patientId: id, goal: t.slug.trim(), note: t.note ?? null })),
        );
      }
    }
    if (body.interests) {
      await tx.delete(patientInterests).where(eq(patientInterests.patientId, id));
      const rows = dedupe(body.interests);
      if (rows.length) {
        await tx.insert(patientInterests).values(
          rows.map((t) => ({ patientId: id, interest: t.slug.trim(), note: t.note ?? null })),
        );
      }
    }
  });

  const patient = await loadPatientProfile(id);
  if (!patient) fail(404, "patient not found");
  return c.json<UpdateProfileResponse>({ patient, ...(warning ? { warning } : {}) });
});

/* -------------------------- POST /api/patients/:id/complete-induction */

patientsRoutes.post("/:id/complete-induction", async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  // The matcher itself is pure (`src/lib/matching.ts` — geography-gated,
  // scored on goals/conditions/fitness/availability/interests); this route
  // only loads its inputs, records the membership, and shapes the response.
  const { candidate, pods: matchPods, podRows } = await loadMatchInputs(patient);
  const decision = chooseBestPod(candidate, matchPods);
  const chosen = decision.podId ? (podRows.get(decision.podId) ?? null) : null;
  const distanceKm = decision.distanceKm === null ? null : roundKm(decision.distanceKm);

  await db.transaction(async (tx) => {
    await tx
      .update(patients)
      .set({ inductionStatus: "complete" })
      .where(eq(patients.id, id));
    if (chosen) {
      await tx.delete(podMembers).where(eq(podMembers.patientId, id));
      await tx.insert(podMembers).values({ podId: chosen.id, patientId: id });
    }
  });

  // Member lists exclude the inducting patient, so size + 1 is the count
  // after the insert above.
  const memberCount = chosen
    ? (matchPods.find((p) => p.id === chosen.id)?.members.length ?? 0) + 1
    : 0;

  const profile = await loadPatientProfile(id);
  if (!profile) fail(404, "patient not found");
  return c.json<CompleteInductionResponse>({
    patient: profile,
    pod: chosen ? toPodSummary(chosen, memberCount) : null,
    distanceKm,
  });
});

/* --------------------------------- GET /api/patients/:id/events */

patientsRoutes.get("/:id/events", queryParams(eventsQuerySchema), async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  const { from, to, status } = c.req.valid("query");
  const fromDate = parseDate(from, "from");
  const toDate = parseDate(to, "to");
  const statuses = parseStatuses(status);

  const [membership] = await db
    .select({ podId: podMembers.podId, joinedAt: podMembers.joinedAt })
    .from(podMembers)
    .where(eq(podMembers.patientId, id))
    .limit(1);
  if (!membership) return c.json<EventWithRsvp[]>([]);

  const filters = [
    eq(events.podId, membership.podId),
    // Same honesty rule as /history: a pod's finished business from before you
    // joined is not your calendar, and must never show up as something you did.
    or(
      notInArray(events.status, ["completed", "cancelled"]),
      gte(events.startsAt, membership.joinedAt),
    )!,
  ];
  if (fromDate) filters.push(gte(events.startsAt, fromDate));
  if (toDate) filters.push(lte(events.startsAt, toDate));
  if (statuses?.length) filters.push(inArray(events.status, statuses));

  const rows = await db
    .select({ event: events, podName: pods.name })
    .from(events)
    .innerJoin(pods, eq(pods.id, events.podId))
    .where(and(...filters))
    .orderBy(asc(events.startsAt));

  const ids = rows.map((r) => r.event.id);
  const [counts, mine] = await Promise.all([countRsvps(ids), myRsvpMap(id, ids)]);

  return c.json<EventWithRsvp[]>(
    rows.map(({ event, podName }) => {
      const own = mine.get(event.id);
      return {
        ...toEventSummary(event, podName),
        myRsvp: own?.status ?? null,
        attended: own?.attended ?? null,
        rsvpCounts: counts.get(event.id) ?? emptyCounts(),
      };
    }),
  );
});

/* -------------------------------- GET /api/patients/:id/history */

patientsRoutes.get("/:id/history", async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  const [membership] = await db
    .select({ podId: podMembers.podId, joinedAt: podMembers.joinedAt })
    .from(podMembers)
    .where(eq(podMembers.patientId, id))
    .limit(1);

  if (!membership) {
    return c.json<HistoryResponse>({
      events: [],
      currentStreak: 0,
      bestStreak: 0,
      attendedCount: 0,
      totalCount: 0,
      adherence: 0,
    });
  }

  // Only events from after they joined count towards adherence.
  const rows = await db
    .select({ event: events, podName: pods.name })
    .from(events)
    .innerJoin(pods, eq(pods.id, events.podId))
    .where(
      and(
        eq(events.podId, membership.podId),
        eq(events.status, "completed"),
        gte(events.startsAt, membership.joinedAt),
      ),
    )
    .orderBy(asc(events.startsAt));

  const mine = await myRsvpMap(
    id,
    rows.map((r) => r.event.id),
  );

  const entries: HistoryEntry[] = rows.map(({ event, podName }) => {
    const own = mine.get(event.id);
    return {
      ...toEventSummary(event, podName),
      attended: own?.attended === true,
      myRsvp: own?.status ?? null,
    };
  });

  const attendedDates = entries.filter((e) => e.attended).map((e) => e.startsAt);
  const { currentStreak, bestStreak } = weeklyStreaks(attendedDates);
  const attendedCount = attendedDates.length;
  const totalCount = entries.length;

  return c.json<HistoryResponse>({
    // Most recent first — the timeline reads top-down.
    events: [...entries].reverse(),
    currentStreak,
    bestStreak,
    attendedCount,
    totalCount,
    adherence: totalCount === 0 ? 0 : Math.round((attendedCount / totalCount) * 100) / 100,
  });
});

/* ------------------------------------ GET /api/patients/:id/map */

patientsRoutes.get("/:id/map", async (c) => {
  const id = requireUuid(c.req.param("id"), "patient id");
  const patient = await getPatientRow(id);
  if (!patient) fail(404, "patient not found");

  const [membership] = await db
    .select({ pod: pods })
    .from(podMembers)
    .innerJoin(pods, eq(pods.id, podMembers.podId))
    .where(eq(podMembers.patientId, id))
    .limit(1);

  const base = {
    id: patient.id,
    lat: patient.lat,
    lng: patient.lng,
    postcode: patient.postcode,
    travelRadiusKm: patient.travelRadiusKm,
  };

  if (!membership) {
    return c.json<MapResponse>({ patient: base, pod: null, members: [], events: [] });
  }

  const [memberRows, eventRows] = await Promise.all([
    db
      .select({ patientId: patients.id, name: patients.name, lat: patients.lat, lng: patients.lng })
      .from(podMembers)
      .innerJoin(patients, eq(patients.id, podMembers.patientId))
      .where(and(eq(podMembers.podId, membership.pod.id), ne(podMembers.patientId, id))),
    db
      .select({ event: events })
      .from(events)
      .where(
        and(
          eq(events.podId, membership.pod.id),
          gte(events.startsAt, new Date()),
          inArray(events.status, ["proposed", "confirmed"]),
        ),
      )
      .orderBy(asc(events.startsAt)),
  ]);

  const memberCount = memberRows.length + 1;

  return c.json<MapResponse>({
    patient: base,
    pod: toPodSummary(membership.pod, memberCount),
    // First name + approximate location only.
    members: memberRows.map((m) => ({
      patientId: m.patientId,
      firstName: firstName(m.name),
      ...jitterCoord(m.lat, m.lng, m.patientId),
    })),
    events: eventRows.map(({ event }) => toEventSummary(event, membership.pod.name)),
  });
});
