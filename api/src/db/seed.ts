/**
 * Deterministic demo seed. Idempotent: truncates everything, then re-inserts
 * with stable UUIDs, so `bun run db:seed` can be run any number of times.
 *
 * All timestamps are computed relative to "now" at run time — past events stay
 * past and upcoming events stay upcoming however long the branch sits around.
 *
 * Postcodes and coordinates are real (resolved via postcodes.io) so the map,
 * travel radii and nearest-pod matching all behave like the real thing.
 */
import { sql as raw } from "drizzle-orm";
import { db, sql } from "./index";
import {
  eventRsvps,
  events,
  inductionSessions,
  patientConditions,
  patientGoals,
  patientInterests,
  patients,
  podMembers,
  pods,
} from "./schema";
import type {
  AgeBand,
  Availability,
  EventSource,
  EventStatus,
  RsvpStatus,
  TransportMode,
} from "../types";

/* ------------------------------------------------------------- helpers */

const pid = (n: number) => `a1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const podId = (n: number) => `b0d00000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evId = (n: number) => `e0e00000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sessionId = (n: number) => `5e551000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const NOW = new Date();

function atDaysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const weeksAgo = (weeks: number, hour: number, minute = 0) =>
  atDaysFromNow(-7 * weeks, hour, minute);

const plusMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

/** Stable 0–99 hash so attendance patterns never shift between runs. */
function hash100(...parts: string[]): number {
  let h = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0) % 100;
}

/* ------------------------------------------------------------ patients */

interface SeedPatient {
  n: number;
  name: string;
  ageBand: AgeBand;
  postcode: string;
  lat: number;
  lng: number;
  travelRadiusKm: number;
  transportModes: TransportMode[];
  mobilityNotes?: string;
  confidenceLevel: number | null;
  fitnessLevel: number | null;
  fitnessNotes?: string;
  availability: Availability;
  conditions: [string, string?][];
  goals: [string, string?][];
  interests: string[];
  /** Index into POD_SEEDS, or null for patients still waiting on a match. */
  pod: number | null;
  inductionStatus?: "pending" | "in_progress" | "complete";
  /** How reliably they turn up, 0–100. Drives the seeded attendance pattern. */
  reliability: number;
}

const PATIENTS: SeedPatient[] = [
  /* ---- Victoria Park Walkers (Hackney / Bethnal Green) ---- */
  {
    n: 1,
    name: "Priya Shah",
    ageBand: "45-59",
    postcode: "E9 6HB",
    lat: 51.546491,
    lng: -0.04511,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 2,
    fitnessLevel: 2,
    fitnessNotes: "Walks to the shops and back most days. Gets out of breath on the stairs.",
    availability: { mon: ["morning"], wed: ["morning", "afternoon"], sat: ["morning"], sun: ["morning"] },
    conditions: [
      ["type2_diabetes", "Diagnosed 14 months ago, managed with metformin."],
      ["obesity"],
    ],
    goals: [
      ["lose_weight", "Wants to be off medication in two years."],
      ["social_connection", "Moved to Hackney recently and does not know many people."],
    ],
    interests: ["walking", "gardening"],
    pod: 0,
    reliability: 100,
  },
  {
    n: 2,
    name: "Doreen Whitfield",
    ageBand: "75+",
    postcode: "E9 6HA",
    lat: 51.546207,
    lng: -0.043708,
    travelRadiusKm: 2,
    transportModes: ["walk", "bus"],
    mobilityNotes: "Uses a walking stick outdoors. Needs a bench every twenty minutes or so.",
    confidenceLevel: 3,
    fitnessLevel: 1,
    fitnessNotes: "Short, slow walks only.",
    availability: { tue: ["morning"], thu: ["morning"], sat: ["morning"] },
    conditions: [["arthritis", "Both knees."], ["hypertension"]],
    goals: [["improve_fitness"], ["social_connection"]],
    interests: ["walking", "crafts"],
    pod: 0,
    reliability: 85,
  },
  {
    n: 3,
    name: "Marcus Bell",
    ageBand: "45-59",
    postcode: "E2 9PA",
    lat: 51.527774,
    lng: -0.055182,
    travelRadiusKm: 5,
    transportModes: ["walk", "cycle", "tube"],
    confidenceLevel: 4,
    fitnessLevel: 3,
    fitnessNotes: "Cycles to work twice a week.",
    availability: { mon: ["evening"], wed: ["evening"], sat: ["morning", "afternoon"] },
    conditions: [["hypertension", "GP suggested lifestyle change before medication."]],
    goals: [["reduce_blood_pressure"], ["manage_stress"]],
    interests: ["walking", "cycling", "swimming"],
    pod: 0,
    reliability: 70,
  },
  {
    n: 4,
    name: "Aisha Rahman",
    ageBand: "30-44",
    postcode: "E3 5SX",
    lat: 51.532336,
    lng: -0.045053,
    travelRadiusKm: 4,
    transportModes: ["walk", "bus"],
    confidenceLevel: 3,
    fitnessLevel: 2,
    availability: { tue: ["morning"], thu: ["morning"], sat: ["morning"], sun: ["afternoon"] },
    conditions: [["obesity"], ["anxiety", "Prefers small groups to classes."]],
    goals: [["lose_weight"], ["manage_stress"]],
    interests: ["walking", "yoga"],
    pod: 0,
    reliability: 65,
  },
  {
    n: 5,
    name: "Terry Okafor",
    ageBand: "60-74",
    postcode: "E8 1HE",
    lat: 51.545306,
    lng: -0.054939,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 2,
    fitnessLevel: 2,
    availability: { mon: ["morning"], wed: ["morning"], fri: ["morning"], sat: ["morning"] },
    conditions: [["type2_diabetes"]],
    goals: [["improve_fitness"], ["social_connection"]],
    interests: ["walking", "gardening"],
    pod: 0,
    reliability: 90,
  },
  {
    n: 6,
    name: "Linda Grayson",
    ageBand: "60-74",
    postcode: "E5 8DQ",
    lat: 51.558112,
    lng: -0.057134,
    travelRadiusKm: 4,
    transportModes: ["walk", "bus", "tube"],
    confidenceLevel: 3,
    fitnessLevel: 3,
    availability: { wed: ["afternoon"], fri: ["morning"], sat: ["morning"] },
    conditions: [["hypertension"], ["arthritis", "Hips, worse in the cold."]],
    goals: [["reduce_blood_pressure"]],
    interests: ["walking", "dancing"],
    pod: 0,
    reliability: 55,
  },
  {
    n: 7,
    name: "Samuel Adeyemi",
    ageBand: "60-74",
    postcode: "E2 0ET",
    lat: 51.527208,
    lng: -0.055192,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 2,
    fitnessLevel: 2,
    availability: { tue: ["morning"], sat: ["morning"], sun: ["morning"] },
    conditions: [["type2_diabetes"], ["obesity"]],
    goals: [["lose_weight"]],
    interests: ["walking", "swimming"],
    pod: 0,
    reliability: 75,
  },

  /* ---- Islington Strength & Balance ---- */
  {
    n: 8,
    name: "Margaret Cole",
    ageBand: "75+",
    postcode: "N5 1QP",
    lat: 51.548821,
    lng: -0.101478,
    travelRadiusKm: 2,
    transportModes: ["walk", "bus"],
    mobilityNotes: "Had a fall last winter. Prefers indoor sessions with something to hold onto.",
    confidenceLevel: 2,
    fitnessLevel: 1,
    availability: { mon: ["morning"], wed: ["morning"], fri: ["morning"] },
    conditions: [["arthritis"], ["osteoporosis"]],
    goals: [["improve_fitness"], ["social_connection"]],
    interests: ["crafts", "walking"],
    pod: 1,
    reliability: 90,
  },
  {
    n: 9,
    name: "Raj Patel",
    ageBand: "60-74",
    postcode: "N1 0PL",
    lat: 51.534911,
    lng: -0.104927,
    travelRadiusKm: 4,
    transportModes: ["walk", "tube", "bus"],
    confidenceLevel: 3,
    fitnessLevel: 2,
    availability: { tue: ["morning", "afternoon"], thu: ["morning"], sun: ["morning"] },
    conditions: [["type2_diabetes"], ["hypertension"]],
    goals: [["reduce_blood_pressure"], ["lose_weight"]],
    interests: ["walking", "swimming"],
    pod: 1,
    reliability: 80,
  },
  {
    n: 10,
    name: "Eileen Murphy",
    ageBand: "75+",
    postcode: "N7 9SF",
    lat: 51.553778,
    lng: -0.11613,
    travelRadiusKm: 2,
    transportModes: ["walk"],
    mobilityNotes: "Slow on hills. Happiest on flat routes close to home.",
    confidenceLevel: 2,
    fitnessLevel: 1,
    availability: { mon: ["morning"], wed: ["morning"], fri: ["morning"] },
    conditions: [["arthritis"]],
    goals: [["improve_fitness"]],
    interests: ["gardening", "crafts"],
    pod: 1,
    reliability: 70,
  },
  {
    n: 11,
    name: "George Nwosu",
    ageBand: "60-74",
    postcode: "N1 1BU",
    lat: 51.542124,
    lng: -0.114463,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 3,
    fitnessLevel: 2,
    availability: { tue: ["afternoon"], thu: ["afternoon"], sat: ["morning"] },
    conditions: [["hypertension"], ["obesity"]],
    goals: [["lose_weight"], ["social_connection"]],
    interests: ["walking", "dancing"],
    pod: 1,
    reliability: 60,
  },
  {
    n: 12,
    name: "Sylvia Bennett",
    ageBand: "60-74",
    postcode: "N5 1JT",
    lat: 51.548638,
    lng: -0.100765,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 4,
    fitnessLevel: 3,
    availability: { mon: ["morning"], wed: ["morning", "evening"], sat: ["morning"] },
    conditions: [["osteoporosis"]],
    goals: [["improve_fitness"]],
    interests: ["yoga", "walking", "crafts"],
    pod: 1,
    reliability: 85,
  },
  {
    n: 13,
    name: "Hassan Ali",
    ageBand: "45-59",
    postcode: "N7 9RA",
    lat: 51.554294,
    lng: -0.11631,
    travelRadiusKm: 5,
    transportModes: ["walk", "cycle", "bus"],
    confidenceLevel: 3,
    fitnessLevel: 3,
    availability: { wed: ["evening"], fri: ["evening"], sun: ["morning"] },
    conditions: [["anxiety"], ["hypertension"]],
    goals: [["manage_stress"], ["improve_fitness"]],
    interests: ["swimming", "walking", "cycling"],
    pod: 1,
    reliability: 55,
  },

  /* ---- Regent's Canal Cyclists (Camden / Kentish Town) ---- */
  {
    n: 14,
    name: "Tom Fitzgerald",
    ageBand: "45-59",
    postcode: "NW1 7EB",
    lat: 51.53913,
    lng: -0.147205,
    travelRadiusKm: 8,
    transportModes: ["cycle", "walk", "tube"],
    confidenceLevel: 4,
    fitnessLevel: 3,
    availability: { sat: ["morning"], sun: ["morning", "afternoon"], tue: ["evening"] },
    conditions: [["obesity"], ["hypertension"]],
    goals: [["lose_weight"], ["improve_fitness"]],
    interests: ["cycling", "walking"],
    pod: 2,
    reliability: 90,
  },
  {
    n: 15,
    name: "Nadia Kovac",
    ageBand: "30-44",
    postcode: "NW5 1JY",
    lat: 51.551799,
    lng: -0.142017,
    travelRadiusKm: 8,
    transportModes: ["cycle", "tube"],
    confidenceLevel: 4,
    fitnessLevel: 4,
    availability: { sat: ["morning"], sun: ["morning"], thu: ["evening"] },
    conditions: [["anxiety"]],
    goals: [["manage_stress"], ["social_connection"]],
    interests: ["cycling", "yoga"],
    pod: 2,
    reliability: 75,
  },
  {
    n: 16,
    name: "Chris Dunne",
    ageBand: "45-59",
    postcode: "NW1 7ED",
    lat: 51.538781,
    lng: -0.146787,
    travelRadiusKm: 6,
    transportModes: ["cycle", "walk"],
    confidenceLevel: 3,
    fitnessLevel: 3,
    availability: { sun: ["morning"], wed: ["evening"] },
    conditions: [["type2_diabetes"]],
    goals: [["lose_weight"], ["improve_fitness"]],
    interests: ["cycling", "swimming"],
    pod: 2,
    reliability: 65,
  },
  {
    n: 17,
    name: "Yasmin Farah",
    ageBand: "30-44",
    postcode: "NW5 2TJ",
    lat: 51.550435,
    lng: -0.141048,
    travelRadiusKm: 6,
    transportModes: ["cycle", "bus", "walk"],
    confidenceLevel: 3,
    fitnessLevel: 3,
    availability: { sat: ["afternoon"], sun: ["morning"] },
    conditions: [["obesity"]],
    goals: [["lose_weight"]],
    interests: ["cycling", "dancing"],
    pod: 2,
    reliability: 60,
  },
  {
    n: 18,
    name: "Peter Lindqvist",
    ageBand: "60-74",
    postcode: "NW1 7DL",
    lat: 51.539386,
    lng: -0.146387,
    travelRadiusKm: 5,
    transportModes: ["cycle", "walk"],
    mobilityNotes: "Fine on a bike, sore knees walking any distance.",
    confidenceLevel: 3,
    fitnessLevel: 2,
    availability: { tue: ["morning"], thu: ["morning"], sun: ["morning"] },
    conditions: [["hypertension"], ["arthritis"]],
    goals: [["reduce_blood_pressure"]],
    interests: ["cycling", "gardening"],
    pod: 2,
    reliability: 85,
  },
  {
    n: 19,
    name: "Grace Owusu",
    ageBand: "45-59",
    postcode: "NW5 3UP",
    lat: 51.550913,
    lng: -0.143438,
    travelRadiusKm: 5,
    transportModes: ["cycle", "bus", "walk"],
    confidenceLevel: 2,
    fitnessLevel: 2,
    availability: { sat: ["morning"], sun: ["afternoon"] },
    conditions: [["type2_diabetes"], ["anxiety"]],
    goals: [["manage_stress"], ["lose_weight"]],
    interests: ["cycling", "walking", "crafts"],
    pod: 2,
    reliability: 70,
  },

  /* ---- Inducted but not yet matched / mid-induction ---- */
  {
    n: 20,
    name: "Bola Adeyinka",
    ageBand: "30-44",
    postcode: "E8 4LS",
    lat: 51.539739,
    lng: -0.063079,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: 2,
    fitnessLevel: 2,
    availability: { mon: ["evening"], thu: ["evening"], sat: ["morning"] },
    conditions: [["obesity"], ["anxiety"]],
    goals: [["lose_weight"], ["social_connection"]],
    interests: ["walking", "dancing"],
    pod: null,
    reliability: 0,
  },
  {
    n: 21,
    name: "Deborah Klein",
    ageBand: "60-74",
    postcode: "N1 5ET",
    lat: 51.536959,
    lng: -0.078799,
    travelRadiusKm: 3,
    transportModes: ["walk", "bus"],
    confidenceLevel: null,
    fitnessLevel: null,
    availability: {},
    conditions: [["hypertension"]],
    goals: [],
    interests: ["walking"],
    pod: null,
    // Half-way through the voice interview — gives the induction flow something to resume.
    inductionStatus: "in_progress",
    reliability: 0,
  },
];

/* ---------------------------------------------------------------- pods */

interface SeedPod {
  n: number;
  name: string;
  description: string;
  centroidLat: number;
  centroidLng: number;
}

const POD_SEEDS: SeedPod[] = [
  {
    n: 1,
    name: "Victoria Park Walkers",
    description:
      "A gentle walking group around Victoria Park and the canal. We go at the pace of the slowest walker, there are always benches, and there is always a cup of tea afterwards.",
    centroidLat: 51.5405,
    centroidLng: -0.0509,
  },
  {
    n: 2,
    name: "Islington Strength & Balance",
    description:
      "Seated and standing strength work for steadier legs and more confidence on the stairs. Indoors when it is cold, Highbury Fields when it is not.",
    centroidLat: 51.5471,
    centroidLng: -0.109,
  },
  {
    n: 3,
    name: "Regent's Canal Cyclists",
    description:
      "Flat, traffic-free rides along the towpath from Camden Lock. Bikes can be borrowed, and nobody gets left behind.",
    centroidLat: 51.5451,
    centroidLng: -0.1445,
  },
];

/* -------------------------------------------------------------- events */

interface SeedEvent {
  pod: number;
  title: string;
  description: string;
  activityType: string;
  venueName: string;
  lat: number;
  lng: number;
  /** Negative = weeks in the past, positive = days from now. */
  weeksAgo?: number;
  daysAhead?: number;
  hour: number;
  minutes: number;
  status: EventStatus;
  source: EventSource;
}

const EVENT_SEEDS: SeedEvent[] = [
  /* ---- Victoria Park Walkers: six completed weeks ---- */
  {
    pod: 0,
    title: "Tea & Two Miles",
    description: "A flat two-mile loop finishing at the Pavilion cafe. Sticks and frames welcome.",
    activityType: "walking",
    venueName: "St John's Churchyard Gardens, Hackney",
    lat: 51.5468,
    lng: -0.0553,
    weeksAgo: 6,
    hour: 10,
    minutes: 30,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Hackney Marshes Ramble",
    description: "A longer flat walk across the marshes with a shortcut back for anyone who needs it.",
    activityType: "walking",
    venueName: "Hackney Marshes",
    lat: 51.554,
    lng: -0.029,
    weeksAgo: 5,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Victoria Park Lake Loop",
    description: "Once around the boating lake, then coffee by the pavilion.",
    activityType: "walking",
    venueName: "Victoria Park",
    lat: 51.5362,
    lng: -0.0397,
    weeksAgo: 4,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Well Street Common Walk",
    description: "A short local loop, good for a wet morning.",
    activityType: "walking",
    venueName: "Well Street Common",
    lat: 51.5427,
    lng: -0.0453,
    weeksAgo: 3,
    hour: 10,
    minutes: 30,
    status: "completed",
    source: "adhoc",
  },
  {
    pod: 0,
    title: "Canal Towpath Stroll",
    description: "Broadway Market to Mile End along the towpath, with the bus back for anyone tired.",
    activityType: "walking",
    venueName: "Regent's Canal towpath, Broadway Market",
    lat: 51.5372,
    lng: -0.063,
    weeksAgo: 2,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Saturday Park Loop",
    description: "Our regular Saturday morning walk around Victoria Park.",
    activityType: "walking",
    venueName: "Victoria Park",
    lat: 51.5362,
    lng: -0.0397,
    weeksAgo: 1,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  /* ---- Victoria Park Walkers: upcoming ---- */
  {
    pod: 0,
    title: "Saturday Park Loop",
    description: "Our regular Saturday morning walk. Meet by the East Gate; 45 minutes at an easy pace.",
    activityType: "walking",
    venueName: "Victoria Park",
    lat: 51.5362,
    lng: -0.0397,
    daysAhead: 2,
    hour: 10,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Gentle Swim & Sauna",
    description: "Lane swimming at the quiet hour, then a sit in the sauna. Non-swimmers can come for the cafe.",
    activityType: "swimming",
    venueName: "London Fields Lido",
    lat: 51.5399,
    lng: -0.0621,
    daysAhead: 6,
    hour: 11,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 0,
    title: "Community Garden Morning",
    description: "Potting, weeding and a lot of sitting down between jobs. Proposed — tell us if it suits.",
    activityType: "gardening",
    venueName: "Victoria Park Community Garden",
    lat: 51.5375,
    lng: -0.043,
    daysAhead: 12,
    hour: 10,
    minutes: 30,
    status: "proposed",
    source: "adhoc",
  },

  /* ---- Islington Strength & Balance: five completed weeks ---- */
  {
    pod: 1,
    title: "Chair-Based Strength",
    description: "Forty minutes of seated and supported standing work, then tea.",
    activityType: "strength",
    venueName: "Highbury Roundhouse Community Centre",
    lat: 51.5502,
    lng: -0.0997,
    weeksAgo: 5,
    hour: 11,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 1,
    title: "Balance & Steps",
    description: "Step-ups, heel raises and confidence work in the studio.",
    activityType: "strength",
    venueName: "Sobell Leisure Centre",
    lat: 51.5566,
    lng: -0.112,
    weeksAgo: 4,
    hour: 11,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 1,
    title: "Highbury Fields Gentle Circuit",
    description: "Outdoor circuit using the benches and the gentle slope.",
    activityType: "strength",
    venueName: "Highbury Fields",
    lat: 51.549,
    lng: -0.102,
    weeksAgo: 3,
    hour: 10,
    minutes: 30,
    status: "completed",
    source: "adhoc",
  },
  {
    pod: 1,
    title: "Chair-Based Strength",
    description: "Our regular indoor session.",
    activityType: "strength",
    venueName: "Highbury Roundhouse Community Centre",
    lat: 51.5502,
    lng: -0.0997,
    weeksAgo: 2,
    hour: 11,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 1,
    title: "Barnard Park Stroll & Stretch",
    description: "A short walk with a stretch at each corner of the park.",
    activityType: "walking",
    venueName: "Barnard Park",
    lat: 51.5389,
    lng: -0.1121,
    weeksAgo: 1,
    hour: 10,
    minutes: 30,
    status: "completed",
    source: "adhoc",
  },
  /* ---- Islington Strength & Balance: upcoming ---- */
  {
    pod: 1,
    title: "Chair-Based Strength",
    description: "Our regular indoor session. Wear something you can move in; chairs provided.",
    activityType: "strength",
    venueName: "Highbury Roundhouse Community Centre",
    lat: 51.5502,
    lng: -0.0997,
    daysAhead: 3,
    hour: 11,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 1,
    title: "Balance & Steps",
    description: "Studio session focused on steadier legs and stairs.",
    activityType: "strength",
    venueName: "Sobell Leisure Centre",
    lat: 51.5566,
    lng: -0.112,
    daysAhead: 8,
    hour: 11,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 1,
    title: "Islington Green Tai Chi",
    description: "A free outdoor beginners' class. Proposed — say yes if you fancy trying it.",
    activityType: "tai_chi",
    venueName: "Islington Green",
    lat: 51.538,
    lng: -0.103,
    daysAhead: 14,
    hour: 10,
    minutes: 0,
    status: "proposed",
    source: "discovered",
  },

  /* ---- Regent's Canal Cyclists: five completed weeks ---- */
  {
    pod: 2,
    title: "Towpath Ride to Islington",
    description: "Camden Lock to Islington Tunnel and back. Flat and traffic-free.",
    activityType: "cycling",
    venueName: "Regent's Canal towpath, Camden Lock",
    lat: 51.5414,
    lng: -0.1465,
    weeksAgo: 5,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 2,
    title: "Regent's Park Circuit",
    description: "Two laps of the Outer Circle at a chatting pace.",
    activityType: "cycling",
    venueName: "Regent's Park",
    lat: 51.5313,
    lng: -0.157,
    weeksAgo: 4,
    hour: 9,
    minutes: 30,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 2,
    title: "Sunday Canal Cruise",
    description: "Our regular Sunday towpath ride, coffee at the halfway point.",
    activityType: "cycling",
    venueName: "Regent's Canal towpath, Camden Lock",
    lat: 51.5414,
    lng: -0.1465,
    weeksAgo: 3,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "discovered",
  },
  {
    pod: 2,
    title: "Primrose Hill Loop",
    description: "A ride round the base of the hill, then walk the bikes up for the view.",
    activityType: "cycling",
    venueName: "Primrose Hill",
    lat: 51.539,
    lng: -0.159,
    weeksAgo: 2,
    hour: 10,
    minutes: 0,
    status: "completed",
    source: "adhoc",
  },
  {
    pod: 2,
    title: "Kentish Town Farm Ride",
    description: "A short ride ending at the city farm cafe.",
    activityType: "cycling",
    venueName: "Kentish Town City Farm",
    lat: 51.551,
    lng: -0.152,
    weeksAgo: 1,
    hour: 10,
    minutes: 30,
    status: "completed",
    source: "adhoc",
  },
  /* ---- Regent's Canal Cyclists: upcoming ---- */
  {
    pod: 2,
    title: "Sunday Canal Cruise",
    description: "Our regular Sunday towpath ride. Loan bikes available — just say when you RSVP.",
    activityType: "cycling",
    venueName: "Regent's Canal towpath, Camden Lock",
    lat: 51.5414,
    lng: -0.1465,
    daysAhead: 4,
    hour: 10,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 2,
    title: "Hampstead Heath Ponds Ride",
    description: "Up to the Heath the gentle way, with a stop at the ponds.",
    activityType: "cycling",
    venueName: "Hampstead Heath",
    lat: 51.5608,
    lng: -0.16,
    daysAhead: 9,
    hour: 10,
    minutes: 0,
    status: "confirmed",
    source: "discovered",
  },
  {
    pod: 2,
    title: "Beginners' Bike Maintenance",
    description: "Punctures, brakes and gears, taught slowly. Proposed — tell us if it is useful.",
    activityType: "workshop",
    venueName: "Talacre Gardens",
    lat: 51.546,
    lng: -0.145,
    daysAhead: 16,
    hour: 14,
    minutes: 0,
    status: "proposed",
    source: "adhoc",
  },
];

/**
 * Priya's attendance, most-recent-first over the six completed walks:
 * five straight weeks attended, then one missed. Gives the demo a live
 * five-week streak on `/home` and a visible cross on `/history`.
 */
const PRIYA_ATTENDANCE_BY_WEEKS_AGO: Record<number, RsvpStatus | "attended"> = {
  1: "attended",
  2: "attended",
  3: "attended",
  4: "attended",
  5: "attended",
  6: "no",
};

/** Priya's forward-looking RSVPs, keyed by days ahead. Third is left blank on purpose. */
const PRIYA_UPCOMING_RSVP: Record<number, RsvpStatus> = { 2: "yes", 6: "maybe" };

/* ---------------------------------------------------------------- run */

async function seed() {
  console.log("[seed] truncating");
  await db.execute(raw`
    truncate table
      event_rsvps, events, pod_members,
      patient_conditions, patient_goals, patient_interests,
      induction_sessions, pods, patients
    restart identity cascade
  `);

  console.log(`[seed] inserting ${POD_SEEDS.length} pods, ${PATIENTS.length} patients`);

  await db.insert(pods).values(
    POD_SEEDS.map((p) => ({
      id: podId(p.n),
      name: p.name,
      status: "active" as const,
      centroidLat: p.centroidLat,
      centroidLng: p.centroidLng,
      description: p.description,
      createdAt: weeksAgo(12, 9),
    })),
  );

  await db.insert(patients).values(
    PATIENTS.map((p) => ({
      id: pid(p.n),
      name: p.name,
      ageBand: p.ageBand,
      postcode: p.postcode,
      lat: p.lat,
      lng: p.lng,
      travelRadiusKm: p.travelRadiusKm,
      transportModes: p.transportModes,
      mobilityNotes: p.mobilityNotes ?? null,
      confidenceLevel: p.confidenceLevel,
      fitnessLevel: p.fitnessLevel,
      fitnessNotes: p.fitnessNotes ?? null,
      availability: p.availability,
      inductionStatus: p.inductionStatus ?? ("complete" as const),
      createdAt: weeksAgo(11, 9),
    })),
  );

  const conditionRows = PATIENTS.flatMap((p) =>
    p.conditions.map(([condition, note]) => ({ patientId: pid(p.n), condition, note: note ?? null })),
  );
  const goalRows = PATIENTS.flatMap((p) =>
    p.goals.map(([goal, note]) => ({ patientId: pid(p.n), goal, note: note ?? null })),
  );
  const interestRows = PATIENTS.flatMap((p) =>
    p.interests.map((interest) => ({ patientId: pid(p.n), interest, note: null })),
  );

  await db.insert(patientConditions).values(conditionRows);
  await db.insert(patientGoals).values(goalRows);
  await db.insert(patientInterests).values(interestRows);

  // Everyone joined well before the oldest seeded event, so history is complete.
  await db.insert(podMembers).values(
    PATIENTS.filter((p) => p.pod !== null).map((p) => ({
      podId: podId(POD_SEEDS[p.pod!]!.n),
      patientId: pid(p.n),
      joinedAt: weeksAgo(p.n === 1 ? 9 : 10, 9),
    })),
  );

  console.log(`[seed] inserting ${EVENT_SEEDS.length} events`);

  const eventRows = EVENT_SEEDS.map((e, i) => {
    const startsAt =
      e.weeksAgo !== undefined
        ? weeksAgo(e.weeksAgo, e.hour, e.minutes)
        : atDaysFromNow(e.daysAhead!, e.hour, e.minutes);
    return {
      id: evId(i + 1),
      podId: podId(POD_SEEDS[e.pod]!.n),
      title: e.title,
      description: e.description,
      activityType: e.activityType,
      venueName: e.venueName,
      lat: e.lat,
      lng: e.lng,
      startsAt,
      endsAt: plusMinutes(startsAt, e.activityType === "cycling" ? 120 : 90),
      status: e.status,
      source: e.source,
      createdAt: weeksAgo(8, 9),
    };
  });
  await db.insert(events).values(eventRows);

  /* ------------------------------------------------------- attendance */

  const rsvpRows: (typeof eventRsvps.$inferInsert)[] = [];

  EVENT_SEEDS.forEach((seedEvent, i) => {
    const row = eventRows[i]!;
    const members = PATIENTS.filter((p) => p.pod === seedEvent.pod);
    const isPast = seedEvent.weeksAgo !== undefined;

    for (const member of members) {
      const isPriya = member.n === 1;

      if (isPast) {
        let status: RsvpStatus;
        let attended: boolean;

        if (isPriya) {
          const outcome = PRIYA_ATTENDANCE_BY_WEEKS_AGO[seedEvent.weeksAgo!] ?? "no";
          attended = outcome === "attended";
          status = attended ? "yes" : "no";
        } else {
          const roll = hash100(member.name, row.id);
          attended = roll < member.reliability;
          // A handful said yes and then did not make it — the app has to show that.
          status = attended || roll < member.reliability + 12 ? "yes" : "no";
        }

        rsvpRows.push({
          eventId: row.id,
          patientId: pid(member.n),
          status,
          attended,
          updatedAt: row.startsAt,
        });
        continue;
      }

      // Upcoming: leave some members undecided so RSVP buttons have something to do.
      if (isPriya) {
        const own = PRIYA_UPCOMING_RSVP[seedEvent.daysAhead!];
        if (own) {
          rsvpRows.push({
            eventId: row.id,
            patientId: pid(member.n),
            status: own,
            attended: null,
            updatedAt: NOW,
          });
        }
        continue;
      }

      const roll = hash100(row.id, member.name);
      if (roll >= 88) continue; // no answer yet
      const status: RsvpStatus = roll < member.reliability ? "yes" : roll < 80 ? "maybe" : "no";
      rsvpRows.push({
        eventId: row.id,
        patientId: pid(member.n),
        status,
        attended: null,
        updatedAt: NOW,
      });
    }
  });

  await db.insert(eventRsvps).values(rsvpRows);
  console.log(`[seed] inserting ${rsvpRows.length} rsvps`);

  /* ----------------------------------------------- induction sessions */

  await db.insert(inductionSessions).values([
    {
      id: sessionId(1),
      patientId: pid(1),
      status: "complete",
      createdAt: weeksAgo(9, 11),
      transcript: [
        { role: "assistant", text: "Hello Priya. I'm here to find out a bit about you so we can match you with a group nearby. Is now a good time?", at: weeksAgo(9, 11).toISOString() },
        { role: "user", text: "Yes, that's fine.", at: weeksAgo(9, 11, 1).toISOString() },
        { role: "assistant", text: "Lovely. Whereabouts in London are you? A postcode is plenty.", at: weeksAgo(9, 11, 1).toISOString() },
        { role: "user", text: "E9 6HB, near Homerton.", at: weeksAgo(9, 11, 2).toISOString() },
        { role: "assistant", text: "Got it — Homerton. And how far would you happily travel for something like this?", at: weeksAgo(9, 11, 2).toISOString() },
        { role: "user", text: "Walking distance really. Maybe a couple of miles on the bus.", at: weeksAgo(9, 11, 3).toISOString() },
      ],
    },
    {
      id: sessionId(2),
      patientId: pid(21),
      status: "active",
      createdAt: atDaysFromNow(-1, 15),
      transcript: [
        { role: "assistant", text: "Hello. Could I start with your name?", at: atDaysFromNow(-1, 15).toISOString() },
        { role: "user", text: "Deborah Klein.", at: atDaysFromNow(-1, 15, 1).toISOString() },
        { role: "assistant", text: "Thank you Deborah. Whereabouts do you live?", at: atDaysFromNow(-1, 15, 1).toISOString() },
        { role: "user", text: "N1 5ET.", at: atDaysFromNow(-1, 15, 2).toISOString() },
      ],
    },
  ]);

  /* ------------------------------------------------------------ recap */

  console.log("[seed] complete");
  console.log(`  demo patient : Priya Shah  ${pid(1)}`);
  for (const p of POD_SEEDS) console.log(`  pod          : ${p.name.padEnd(28)} ${podId(p.n)}`);
  console.log(
    `  Priya streak : ${Object.values(PRIYA_ATTENDANCE_BY_WEEKS_AGO).filter((v) => v === "attended").length} consecutive weeks attended`,
  );
}

try {
  await seed();
} catch (err) {
  console.error("[seed] failed", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
