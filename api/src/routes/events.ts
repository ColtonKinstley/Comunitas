import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { eventRsvps, events, patients, pods } from "../db/schema";
import { fail, jsonBody, queryParams, requireUuid } from "../lib/http";
import { countRsvps, emptyCounts, firstName, toEventSummary } from "../lib/queries";
import type { EventDetail, RsvpResponse } from "../types";

const rsvpSchema = z
  .object({
    patientId: z.uuid(),
    status: z.enum(["yes", "no", "maybe"]),
  })
  .strict();

const detailQuerySchema = z.object({
  /** Optional: include the caller's own RSVP in the response. */
  patientId: z.uuid().optional(),
});

export const eventsRoutes = new Hono();

/* ------------------------------------------- GET /api/events/:id */

eventsRoutes.get("/:id", queryParams(detailQuerySchema), async (c) => {
  const id = requireUuid(c.req.param("id"), "event id");
  const { patientId } = c.req.valid("query");

  const [row] = await db
    .select({ event: events, podName: pods.name })
    .from(events)
    .innerJoin(pods, eq(pods.id, events.podId))
    .where(eq(events.id, id))
    .limit(1);
  if (!row) fail(404, "event not found");

  const rsvpRows = await db
    .select({ status: eventRsvps.status, attended: eventRsvps.attended, name: patients.name, patientId: patients.id })
    .from(eventRsvps)
    .innerJoin(patients, eq(patients.id, eventRsvps.patientId))
    .where(eq(eventRsvps.eventId, id));

  const counts = emptyCounts();
  const going: string[] = [];
  let myRsvp: EventDetail["myRsvp"] = null;
  let attended: boolean | null = null;

  for (const r of rsvpRows) {
    counts[r.status] += 1;
    if (r.status === "yes") going.push(firstName(r.name));
    if (patientId && r.patientId === patientId) {
      myRsvp = r.status;
      attended = r.attended;
    }
  }

  return c.json<EventDetail>({
    ...toEventSummary(row.event, row.podName),
    rsvpCounts: counts,
    going: going.sort((a, b) => a.localeCompare(b)),
    myRsvp,
    attended,
  });
});

/* ------------------------------------- POST /api/events/:id/rsvp */

eventsRoutes.post("/:id/rsvp", jsonBody(rsvpSchema), async (c) => {
  const id = requireUuid(c.req.param("id"), "event id");
  const { patientId, status } = c.req.valid("json");

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) fail(404, "event not found");

  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) fail(404, "patient not found");

  await db
    .insert(eventRsvps)
    .values({ eventId: id, patientId, status, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [eventRsvps.eventId, eventRsvps.patientId],
      set: { status, updatedAt: new Date() },
    });

  const counts = await countRsvps([id]);

  return c.json<RsvpResponse>({
    eventId: id,
    patientId,
    status,
    rsvpCounts: counts.get(id) ?? emptyCounts(),
  });
});

/** Guard against accidental unfiltered listing — pod events come via /api/patients/:id/events. */
eventsRoutes.get("/", (c) => c.json({ error: "specify an event id" }, 400));
