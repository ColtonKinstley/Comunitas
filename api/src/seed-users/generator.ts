import type { AgeBand, Availability, DayKey, TimeSlot, TransportMode } from "../types.js";
import { DAY_KEYS } from "../types.js";
import {
  AGE_BAND_WEIGHTS,
  AVAILABILITY_ARCHETYPES,
  CONDITION_WEIGHTS_BY_BAND,
  FIRST_NAMES,
  GOAL_AFFINITY,
  GOAL_SLUGS,
  INTEREST_AFFINITY,
  INTEREST_SLUGS,
  SURNAMES,
  TRANSPORT_PROFILES,
} from "./data.js";
import { Rng, sampleCoords } from "./rng.js";

export interface GeneratedUser {
  name: string;
  ageBand: AgeBand;
  lat: number;
  lng: number;
  postcode: string | null; // filled by the postcode pass, null here
  travelRadiusKm: number;
  transportModes: TransportMode[];
  confidenceLevel: number; // 1-5
  fitnessLevel: number; // 1-5
  availability: Availability;
  conditions: string[]; // 0-3 slugs
  goals: string[]; // 1-3 slugs
  interests: string[]; // 2-4 slugs
  mobilityNotes: string | null; // filled by the notes pass, null here
  fitnessNotes: string | null;
}

const FITNESS_BASE: Record<AgeBand, number> = {
  "18-29": 3.4,
  "30-44": 3.2,
  "45-59": 2.8,
  "60-74": 2.4,
  "75+": 2.0,
};

const clamp15 = (n: number): number => Math.min(5, Math.max(1, n));

function pickConditions(rng: Rng, ageBand: AgeBand): string[] {
  const target = rng.weighted([[0, 15], [1, 40], [2, 30], [3, 15]] as const);
  const weights = CONDITION_WEIGHTS_BY_BAND[ageBand];
  const chosen: string[] = [];
  while (chosen.length < target) {
    const slug = rng.weighted(weights);
    if (!chosen.includes(slug)) chosen.push(slug); // re-draw on duplicate
  }
  return chosen;
}

function pickGoals(rng: Rng, conditions: string[]): string[] {
  const pool = [...new Set(conditions.flatMap((c) => GOAL_AFFINITY[c] ?? []))];
  const source = pool.length > 0 ? pool : GOAL_SLUGS;
  const goals = rng.sample(source, rng.int(1, 3));
  if (rng.chance(0.2)) {
    // Noise so users aren't stereotypes: swap one goal for an off-affinity one.
    const outside = GOAL_SLUGS.filter((g) => !goals.includes(g));
    if (outside.length > 0 && goals.length > 0) {
      goals[rng.int(0, goals.length - 1)] = rng.pick(outside);
    }
  }
  return goals;
}

function pickInterests(rng: Rng, goals: string[]): string[] {
  const pool = [...new Set(goals.flatMap((g) => INTEREST_AFFINITY[g] ?? []))];
  const source = pool.length > 0 ? pool : INTEREST_SLUGS;
  const interests = rng.sample(source, rng.int(2, 4));
  while (interests.length < 2) {
    const extra = rng.pick(INTEREST_SLUGS);
    if (!interests.includes(extra)) interests.push(extra);
  }
  if (rng.chance(0.25) && interests.length < 4) {
    const extra = rng.pick(INTEREST_SLUGS);
    if (!interests.includes(extra)) interests.push(extra);
  }
  return interests;
}

function pickAvailability(rng: Rng, ageBand: AgeBand): Availability {
  const matching = AVAILABILITY_ARCHETYPES.filter((a) => a.bands.includes(ageBand));
  const archetypes = matching.length > 0 ? matching : AVAILABILITY_ARCHETYPES;
  const archetype = rng.weighted(archetypes.map((a) => [a, a.weight] as const));
  const days: Partial<Record<DayKey, TimeSlot[]>> = {};
  for (const [day, slots] of Object.entries(archetype.days) as [DayKey, TimeSlot[]][]) {
    days[day] = [...slots];
  }
  const present = Object.keys(days) as DayKey[];
  if (rng.chance(0.3) && present.length > 1) {
    delete days[rng.pick(present)];
  }
  if (rng.chance(0.3)) {
    const weekdays: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
    const missing = weekdays.filter((d) => !(d in days));
    if (missing.length > 0) days[rng.pick(missing)] = ["morning"];
  }
  // Keep day-key order stable so equal availabilities compare equal.
  const ordered: Partial<Record<DayKey, TimeSlot[]>> = {};
  for (const day of DAY_KEYS) {
    if (days[day]) ordered[day] = days[day];
  }
  return ordered;
}

export function generateUsers(opts: {
  center: { lat: number; lng: number };
  radiusKm: number;
  count: number;
  seed: number | string;
}): GeneratedUser[] {
  const rng = new Rng(opts.seed);
  const coords = sampleCoords(rng, opts.center, opts.radiusKm, opts.count);
  const users: GeneratedUser[] = [];

  for (let i = 0; i < opts.count; i++) {
    const ageBand = rng.weighted(AGE_BAND_WEIGHTS);
    const firstNames = FIRST_NAMES.filter((n) => n.bands.includes(ageBand));
    const name = `${rng.pick(firstNames).name} ${rng.pick(SURNAMES)}`;

    const conditions = pickConditions(rng, ageBand);
    const goals = pickGoals(rng, conditions);
    const interests = pickInterests(rng, goals);

    const profile = rng.weighted(TRANSPORT_PROFILES.map((p) => [p, p.weight] as const));
    let travelRadiusKm = rng.int(profile.radius[0], profile.radius[1]);
    if (ageBand === "60-74" || ageBand === "75+") travelRadiusKm = Math.min(travelRadiusKm, 8);

    const fitnessLevel = clamp15(
      Math.round(FITNESS_BASE[ageBand] - 0.4 * conditions.length + rng.gaussian(0, 0.7)),
    );
    const confidenceLevel = clamp15(fitnessLevel + rng.int(-1, 1));

    users.push({
      name,
      ageBand,
      lat: coords[i]!.lat,
      lng: coords[i]!.lng,
      postcode: null,
      travelRadiusKm,
      transportModes: [...profile.modes],
      confidenceLevel,
      fitnessLevel,
      availability: pickAvailability(rng, ageBand),
      conditions,
      goals,
      interests,
      mobilityNotes: null,
      fitnessNotes: null,
    });
  }
  return users;
}
