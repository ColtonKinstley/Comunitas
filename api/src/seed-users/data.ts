/**
 * Persona tables for the user seeder. Slugs mirror the client vocabulary in
 * `web/src/features/profile/vocab.ts` — keep the two in sync by hand.
 */
import type { AgeBand, DayKey, TimeSlot, TransportMode } from "../types.js";

// bands = age bands where the first name is plausible; generation-skewed
// (Margaret peaks 75+, Jayden peaks 18-29) without being absolute.
export const FIRST_NAMES: { name: string; bands: AgeBand[] }[] = [
  // skew older
  { name: "Margaret", bands: ["60-74", "75+"] },
  { name: "Brian", bands: ["60-74", "75+"] },
  { name: "Doreen", bands: ["60-74", "75+"] },
  { name: "Derek", bands: ["60-74", "75+"] },
  { name: "Sylvia", bands: ["60-74", "75+"] },
  { name: "Ronald", bands: ["60-74", "75+"] },
  { name: "Patricia", bands: ["45-59", "60-74", "75+"] },
  { name: "Terence", bands: ["60-74", "75+"] },
  { name: "Beverley", bands: ["45-59", "60-74"] },
  { name: "Winston", bands: ["60-74", "75+"] },
  { name: "Cynthia", bands: ["60-74", "75+"] },
  { name: "Leonard", bands: ["60-74", "75+"] },
  // middle
  { name: "Sarah", bands: ["30-44", "45-59"] },
  { name: "David", bands: ["45-59", "60-74"] },
  { name: "Priya", bands: ["30-44", "45-59"] },
  { name: "Mohammed", bands: ["18-29", "30-44", "45-59"] },
  { name: "Fatima", bands: ["30-44", "45-59"] },
  { name: "Kwame", bands: ["30-44", "45-59"] },
  { name: "Aisha", bands: ["18-29", "30-44"] },
  { name: "Rajesh", bands: ["45-59", "60-74"] },
  { name: "Wei", bands: ["30-44", "45-59"] },
  { name: "Tunde", bands: ["30-44", "45-59"] },
  { name: "Zainab", bands: ["18-29", "30-44"] },
  { name: "Marek", bands: ["30-44", "45-59"] },
  { name: "Agnieszka", bands: ["30-44", "45-59"] },
  { name: "Sofia", bands: ["18-29", "30-44"] },
  { name: "Emma", bands: ["30-44", "45-59"] },
  { name: "James", bands: ["30-44", "45-59", "60-74"] },
  { name: "Nadia", bands: ["30-44", "45-59"] },
  { name: "Carlos", bands: ["30-44", "45-59"] },
  { name: "Yusuf", bands: ["18-29", "30-44"] },
  { name: "Grace", bands: ["18-29", "60-74", "75+"] },
  { name: "Devon", bands: ["30-44", "45-59"] },
  { name: "Mei", bands: ["30-44", "45-59"] },
  { name: "Ade", bands: ["30-44", "45-59"] },
  { name: "Kemi", bands: ["30-44", "45-59"] },
  { name: "Hasan", bands: ["45-59", "60-74"] },
  { name: "Lena", bands: ["30-44", "45-59"] },
  { name: "Paulo", bands: ["30-44", "45-59"] },
  { name: "Anika", bands: ["18-29", "30-44"] },
  // skew younger
  { name: "Jayden", bands: ["18-29", "30-44"] },
  { name: "Chloe", bands: ["18-29", "30-44"] },
  { name: "Tyler", bands: ["18-29", "30-44"] },
  { name: "Amara", bands: ["18-29", "30-44"] },
  { name: "Kai", bands: ["18-29", "30-44"] },
  { name: "Maya", bands: ["18-29", "30-44"] },
  { name: "Leon", bands: ["18-29", "30-44"] },
  { name: "Yasmin", bands: ["18-29", "30-44"] },
  { name: "Ethan", bands: ["18-29"] },
  { name: "Zara", bands: ["18-29", "30-44"] },
  { name: "Dylan", bands: ["18-29", "30-44"] },
  { name: "Freya", bands: ["18-29", "30-44"] },
  { name: "Omar", bands: ["18-29", "30-44"] },
  { name: "Nia", bands: ["18-29", "30-44"] },
  { name: "Callum", bands: ["18-29", "30-44"] },
  { name: "Isla", bands: ["18-29"] },
  { name: "Reece", bands: ["18-29", "30-44"] },
  { name: "Tanya", bands: ["30-44", "45-59"] },
  { name: "Bilal", bands: ["18-29", "30-44"] },
  { name: "Shanice", bands: ["18-29", "30-44"] },
];

export const SURNAMES: string[] = [
  "Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Wilson", "Evans",
  "Patel", "Khan", "Begum", "Ahmed", "Ali", "Hussain", "Shah", "Chowdhury",
  "Okafor", "Adeyemi", "Mensah", "Osei", "Campbell", "Thomas", "Roberts",
  "Chen", "Wong", "Li", "Zhang", "Nguyen", "Kim", "Singh", "Kaur", "Sharma",
  "Kowalski", "Nowak", "Silva", "Santos", "Fernandes", "Costa", "Murphy",
  "O'Brien", "Kelly", "Byrne", "Walsh", "Johnson", "White", "Green", "Hall",
  "Clarke", "Lewis", "Baker", "Mitchell", "Barnes", "Osman",
];

export const AGE_BAND_WEIGHTS: [AgeBand, number][] = [
  ["18-29", 8], ["30-44", 20], ["45-59", 30], ["60-74", 30], ["75+", 12],
];

export const CONDITION_WEIGHTS_BY_BAND: Record<AgeBand, [string, number][]> = {
  "18-29": [["anxiety", 30], ["obesity", 15], ["back_pain", 10], ["type2_diabetes", 4], ["hypertension", 3], ["high_cholesterol", 2], ["arthritis", 1], ["copd", 1]],
  "30-44": [["anxiety", 25], ["obesity", 20], ["back_pain", 15], ["type2_diabetes", 10], ["hypertension", 10], ["high_cholesterol", 8], ["arthritis", 3], ["copd", 2]],
  "45-59": [["hypertension", 22], ["type2_diabetes", 18], ["obesity", 16], ["back_pain", 14], ["high_cholesterol", 14], ["anxiety", 10], ["arthritis", 8], ["copd", 4]],
  "60-74": [["hypertension", 25], ["arthritis", 20], ["type2_diabetes", 18], ["high_cholesterol", 15], ["back_pain", 10], ["copd", 8], ["obesity", 8], ["anxiety", 6]],
  "75+":   [["arthritis", 28], ["hypertension", 25], ["high_cholesterol", 14], ["type2_diabetes", 12], ["copd", 10], ["back_pain", 8], ["anxiety", 5], ["obesity", 4]],
};

// condition -> goals that plausibly follow from it
export const GOAL_AFFINITY: Record<string, string[]> = {
  type2_diabetes: ["lose_weight", "improve_fitness"],
  hypertension: ["reduce_blood_pressure", "manage_stress", "improve_fitness"],
  obesity: ["lose_weight", "improve_fitness", "build_strength"],
  anxiety: ["manage_stress", "better_sleep", "social_connection"],
  arthritis: ["build_strength", "improve_fitness"],
  high_cholesterol: ["lose_weight", "improve_fitness"],
  copd: ["improve_fitness", "better_sleep"],
  back_pain: ["build_strength", "improve_fitness"],
};

// goal -> interests that serve it
export const INTEREST_AFFINITY: Record<string, string[]> = {
  lose_weight: ["walking", "swimming", "cycling", "dancing"],
  improve_fitness: ["walking", "cycling", "swimming", "dancing"],
  reduce_blood_pressure: ["walking", "tai_chi", "gardening", "swimming"],
  social_connection: ["crafts", "gardening", "dancing", "birdwatching", "walking"],
  manage_stress: ["yoga", "tai_chi", "gardening", "birdwatching"],
  better_sleep: ["yoga", "walking", "tai_chi"],
  build_strength: ["yoga", "swimming", "cycling", "dancing"],
};

// Verbatim copies of the client vocab, for noise sampling.
export const GOAL_SLUGS: string[] = [
  "lose_weight",
  "improve_fitness",
  "reduce_blood_pressure",
  "social_connection",
  "manage_stress",
  "better_sleep",
  "build_strength",
];

export const INTEREST_SLUGS: string[] = [
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

export const TRANSPORT_PROFILES: { modes: TransportMode[]; radius: [number, number]; weight: number }[] = [
  { modes: ["walk"], radius: [1, 3], weight: 25 },
  { modes: ["walk", "bus"], radius: [2, 5], weight: 30 },
  { modes: ["walk", "tube", "bus"], radius: [3, 8], weight: 20 },
  { modes: ["cycle", "walk"], radius: [3, 8], weight: 10 },
  { modes: ["car"], radius: [5, 15], weight: 15 },
];

export const AVAILABILITY_ARCHETYPES: { weight: number; bands: AgeBand[]; days: Partial<Record<DayKey, TimeSlot[]>> }[] = [
  // 9-to-5 worker: evenings + weekend
  { weight: 30, bands: ["18-29", "30-44", "45-59"], days: { mon: ["evening"], wed: ["evening"], thu: ["evening"], sat: ["morning", "afternoon"], sun: ["morning"] } },
  // shift worker: scattered
  { weight: 10, bands: ["18-29", "30-44", "45-59"], days: { tue: ["morning"], thu: ["afternoon"], sun: ["afternoon", "evening"] } },
  // part-time / carer: weekday mid-days
  { weight: 15, bands: ["30-44", "45-59", "60-74"], days: { mon: ["morning"], tue: ["morning", "afternoon"], thu: ["morning"], fri: ["afternoon"] } },
  // retired: weekday mornings/afternoons
  { weight: 35, bands: ["60-74", "75+"], days: { mon: ["morning", "afternoon"], tue: ["morning"], wed: ["morning", "afternoon"], thu: ["morning"], fri: ["morning", "afternoon"] } },
  // weekend-only
  { weight: 10, bands: ["18-29", "30-44", "45-59", "60-74"], days: { sat: ["morning", "afternoon", "evening"], sun: ["morning", "afternoon"] } },
];
