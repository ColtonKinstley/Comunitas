/**
 * The slug vocabularies the profile editor offers, mirroring the seed data and
 * the matcher's expectations. Anything already on the patient that isn't listed
 * here is merged in at render time, so the voice induction can invent a slug
 * without the editor losing it.
 */
import type { AgeBand, DayKey, TimeSlot, TransportMode } from "../../lib/types";

export const AGE_BANDS: AgeBand[] = ["18-29", "30-44", "45-59", "60-74", "75+"];

export const TRANSPORT_MODES: { slug: TransportMode; label: string }[] = [
  { slug: "walk", label: "On foot" },
  { slug: "cycle", label: "Bike" },
  { slug: "bus", label: "Bus" },
  { slug: "tube", label: "Tube" },
  { slug: "car", label: "Car" },
];

export const CONDITION_SLUGS = [
  "type2_diabetes",
  "hypertension",
  "obesity",
  "anxiety",
  "arthritis",
  "high_cholesterol",
  "copd",
  "back_pain",
];

export const GOAL_SLUGS = [
  "lose_weight",
  "improve_fitness",
  "reduce_blood_pressure",
  "social_connection",
  "manage_stress",
  "better_sleep",
  "build_strength",
];

export const INTEREST_SLUGS = [
  "walking",
  "swimming",
  "gardening",
  "cycling",
  "dancing",
  "yoga",
  "crafts",
  "tai_chi",
  "birdwatching",
];

/** Plain-language rungs for the 1–5 scales — numbers alone mean nothing. */
export const FITNESS_LABELS: Record<number, string> = {
  1: "Just starting out",
  2: "Getting going",
  3: "Fairly active",
  4: "Active",
  5: "Very active",
};

export const CONFIDENCE_LABELS: Record<number, string> = {
  1: "A bit nervous",
  2: "Finding my feet",
  3: "Comfortable",
  4: "Confident",
  5: "Very confident",
};

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_FULL_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Vocabulary first, then anything the patient already has that we don't list. */
export function optionsWith(vocabulary: string[], existing: string[]): string[] {
  const extras = existing.filter((slug) => !vocabulary.includes(slug));
  return [...vocabulary, ...extras];
}
