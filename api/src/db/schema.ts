import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AgeBand,
  Availability,
  EventSource,
  EventStatus,
  InductionSessionStatus,
  InductionStatus,
  PodStatus,
  RsvpStatus,
  TranscriptEntry,
  TransportMode,
} from "../types.js";
import { user } from "./auth-schema.js";

export * from "./auth-schema.js";

/**
 * Enum-ish columns are plain `text` narrowed with `$type<>()`. Postgres enums
 * would need migrations to extend; `drizzle-kit push` + text keeps the hackathon
 * loop fast while TypeScript still enforces the vocabulary.
 */

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable: the realtime induction creates the row before it learns a name.
  name: text("name"),
  ageBand: text("age_band").$type<AgeBand>(),
  postcode: text("postcode"),
  lat: real("lat"),
  lng: real("lng"),
  travelRadiusKm: integer("travel_radius_km").notNull().default(3),
  transportModes: text("transport_modes").array().$type<TransportMode[]>(),
  mobilityNotes: text("mobility_notes"),
  confidenceLevel: integer("confidence_level"),
  fitnessLevel: integer("fitness_level"),
  fitnessNotes: text("fitness_notes"),
  availability: jsonb("availability").$type<Availability>(),
  inductionStatus: text("induction_status").$type<InductionStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Auth identity (better-auth user). Null for demo/seed patients and pre-auth inductions. */
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
});

export const patientConditions = pgTable(
  "patient_conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    condition: text("condition").notNull(),
    note: text("note"),
  },
  (t) => [
    index("patient_conditions_patient_idx").on(t.patientId),
    uniqueIndex("patient_conditions_unique").on(t.patientId, t.condition),
  ],
);

export const patientGoals = pgTable(
  "patient_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    goal: text("goal").notNull(),
    note: text("note"),
  },
  (t) => [
    index("patient_goals_patient_idx").on(t.patientId),
    uniqueIndex("patient_goals_unique").on(t.patientId, t.goal),
  ],
);

export const patientInterests = pgTable(
  "patient_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    interest: text("interest").notNull(),
    note: text("note"),
  },
  (t) => [
    index("patient_interests_patient_idx").on(t.patientId),
    uniqueIndex("patient_interests_unique").on(t.patientId, t.interest),
  ],
);

export const pods = pgTable("pods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status").$type<PodStatus>().notNull().default("forming"),
  centroidLat: real("centroid_lat"),
  centroidLng: real("centroid_lng"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const podMembers = pgTable(
  "pod_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    podId: uuid("pod_id")
      .notNull()
      .references(() => pods.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pod_members_pod_idx").on(t.podId),
    // One pod per patient keeps "your pod" unambiguous across the app.
    uniqueIndex("pod_members_patient_unique").on(t.patientId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    podId: uuid("pod_id")
      .notNull()
      .references(() => pods.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    activityType: text("activity_type").notNull(),
    venueName: text("venue_name"),
    lat: real("lat"),
    lng: real("lng"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").$type<EventStatus>().notNull().default("proposed"),
    source: text("source").$type<EventSource>().notNull().default("discovered"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_pod_starts_idx").on(t.podId, t.startsAt)],
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    status: text("status").$type<RsvpStatus>().notNull(),
    /** null until the event completes. */
    attended: boolean("attended"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("event_rsvps_patient_idx").on(t.patientId),
    uniqueIndex("event_rsvps_unique").on(t.eventId, t.patientId),
  ],
);

export const inductionSessions = pgTable("induction_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  transcript: jsonb("transcript").$type<TranscriptEntry[]>().notNull().default([]),
  status: text("status").$type<InductionSessionStatus>().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------- relations */

export const patientsRelations = relations(patients, ({ many, one }) => ({
  conditions: many(patientConditions),
  goals: many(patientGoals),
  interests: many(patientInterests),
  rsvps: many(eventRsvps),
  membership: one(podMembers, {
    fields: [patients.id],
    references: [podMembers.patientId],
  }),
}));

export const patientConditionsRelations = relations(patientConditions, ({ one }) => ({
  patient: one(patients, { fields: [patientConditions.patientId], references: [patients.id] }),
}));

export const patientGoalsRelations = relations(patientGoals, ({ one }) => ({
  patient: one(patients, { fields: [patientGoals.patientId], references: [patients.id] }),
}));

export const patientInterestsRelations = relations(patientInterests, ({ one }) => ({
  patient: one(patients, { fields: [patientInterests.patientId], references: [patients.id] }),
}));

export const podsRelations = relations(pods, ({ many }) => ({
  members: many(podMembers),
  events: many(events),
}));

export const podMembersRelations = relations(podMembers, ({ one }) => ({
  pod: one(pods, { fields: [podMembers.podId], references: [pods.id] }),
  patient: one(patients, { fields: [podMembers.patientId], references: [patients.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  pod: one(pods, { fields: [events.podId], references: [pods.id] }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, { fields: [eventRsvps.eventId], references: [events.id] }),
  patient: one(patients, { fields: [eventRsvps.patientId], references: [patients.id] }),
}));

export const inductionSessionsRelations = relations(inductionSessions, ({ one }) => ({
  patient: one(patients, { fields: [inductionSessions.patientId], references: [patients.id] }),
}));

/* ------------------------------------------------------------ row types */

export type PatientRow = typeof patients.$inferSelect;
export type PodRow = typeof pods.$inferSelect;
export type PodMemberRow = typeof podMembers.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type EventRsvpRow = typeof eventRsvps.$inferSelect;
export type InductionSessionRow = typeof inductionSessions.$inferSelect;
