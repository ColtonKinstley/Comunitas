/**
 * Pure pod-matching strategies — no DB imports. Callers assemble a
 * `MatchCandidate` and the current `MatchPod[]` (see `loadMatchInputs` in
 * `queries.ts`) and get back a decision; `matching.eval.ts` compares the
 * strategies offline on generated users.
 *
 * All three strategies share the same geography gate, because geography is
 * the product thesis: only pods inside the patient's travel radius compete on
 * fit; when nothing is in range the nearest pod wins outright; and without
 * coordinates on either side the smallest pod takes the newcomer (it needs
 * members most). Ties are always broken deterministically: score desc, then
 * distance asc, then pod id asc.
 */
import type { Availability } from "../types.js";
import { haversineKm } from "./geo.js";

export interface MatchCandidate {
  lat: number | null;
  lng: number | null;
  travelRadiusKm: number;
  fitnessLevel: number | null;
  conditions: string[];
  goals: string[];
  interests: string[];
  availability: Availability;
}

export interface MatchPod {
  id: string;
  centroidLat: number | null;
  centroidLng: number | null;
  members: MatchCandidate[];
}

export interface MatchDecision {
  podId: string | null;
  /** Patient → chosen centroid, raw km; null when either side lacks coords. */
  distanceKm: number | null;
}

export type MatchStrategy = (patient: MatchCandidate, pods: MatchPod[]) => MatchDecision;

/* ------------------------------------------------------------- set helpers */

/** Tag slugs come from voice transcription — compare trimmed and lowercased. */
const norm = (s: string) => s.trim().toLowerCase();

const toSet = (slugs: string[]) => new Set(slugs.map(norm));

/** Availability flattened to "mon:morning" keys so weeks compare as sets. */
export function slotSet(availability: Availability): Set<string> {
  const out = new Set<string>();
  for (const [day, slots] of Object.entries(availability)) {
    for (const slot of slots ?? []) out.add(`${day}:${slot}`);
  }
  return out;
}

/** |A∩B| / |A∪B|; 0 when both sets are empty (no evidence of similarity). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/* ---------------------------------------------------------- shared gating */

interface RankedPod {
  pod: MatchPod;
  km: number;
}

type Gate =
  | { kind: "empty" }
  | { kind: "fallback"; pods: MatchPod[] }
  | { kind: "nearest"; best: RankedPod }
  | { kind: "scored"; eligible: RankedPod[] };

const byId = (a: MatchPod, b: MatchPod) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function gate(patient: MatchCandidate, pods: MatchPod[]): Gate {
  if (pods.length === 0) return { kind: "empty" };
  const { lat, lng } = patient;
  const located = pods.filter((p) => p.centroidLat !== null && p.centroidLng !== null);
  if (lat === null || lng === null || located.length === 0) {
    return { kind: "fallback", pods };
  }
  const ranked = located.map((pod) => ({
    pod,
    km: haversineKm(lat, lng, pod.centroidLat!, pod.centroidLng!),
  }));
  const eligible = ranked.filter((r) => r.km <= patient.travelRadiusKm);
  if (eligible.length === 0) {
    const best = [...ranked].sort((a, b) => a.km - b.km || byId(a.pod, b.pod))[0]!;
    return { kind: "nearest", best };
  }
  return { kind: "scored", eligible };
}

/** No-coordinates fallback: member count asc, then pod id for determinism. */
const smallestPod = (pods: MatchPod[]): MatchPod =>
  [...pods].sort((a, b) => a.members.length - b.members.length || byId(a, b))[0]!;

/** Run the shared gate, scoring only the pods that survive it. */
function decide(
  patient: MatchCandidate,
  pods: MatchPod[],
  score: (pod: MatchPod, km: number) => number,
): MatchDecision {
  const g = gate(patient, pods);
  switch (g.kind) {
    case "empty":
      return { podId: null, distanceKm: null };
    case "fallback":
      return { podId: smallestPod(g.pods).id, distanceKm: null };
    case "nearest":
      return { podId: g.best.pod.id, distanceKm: g.best.km };
    case "scored": {
      const best = g.eligible
        .map((r) => ({ ...r, score: score(r.pod, r.km) }))
        .sort((a, b) => b.score - a.score || a.km - b.km || byId(a.pod, b.pod))[0]!;
      return { podId: best.pod.id, distanceKm: best.km };
    }
  }
}

/* --------------------------------------------------------------- subscores */

/**
 * Exponential geo decay: 1.0 at the pod's doorstep, ~0.37 (e⁻¹) at the edge
 * of the travel radius. Chosen over the linear `1 - km/(2·radius)` form
 * because it rewards genuinely-close pods more sharply while never going
 * negative — and every eligible pod is inside the radius anyway.
 */
const geoScore = (km: number, radiusKm: number) => Math.exp(-km / Math.max(radiusKm, 0.1));

/**
 * Target pod size is 8–12. At or below 12 members the factor is 1; beyond
 * that it decays as 1/(1 + (n−12)/12) — a 24-member pod scores half — so
 * newcomers drift toward pods that still have room without a hard cap.
 */
const sizeFactor = (memberCount: number) => 1 / (1 + Math.max(0, memberCount - 12) / 12);

/**
 * Weighted overlap against the pod's member profile: for each of the
 * patient's tags, the fraction of members who share it, averaged over the
 * patient's tags. Neutral 0.5 when either side has nothing to compare.
 */
function profileScore(patientSlugs: string[], memberSets: Set<string>[]): number {
  const mine = toSet(patientSlugs);
  if (mine.size === 0 || memberSets.length === 0) return 0.5;
  let sum = 0;
  for (const tag of mine) {
    let sharing = 0;
    for (const set of memberSets) if (set.has(tag)) sharing++;
    sum += sharing / memberSets.length;
  }
  return sum / mine.size;
}

/** 1 at equal fitness, 0 at the 1↔5 extremes; neutral 0.5 on missing data. */
function fitnessScore(patientFitness: number | null, members: MatchCandidate[]): number {
  const levels = members
    .map((m) => m.fitnessLevel)
    .filter((f): f is number => f !== null);
  if (patientFitness === null || levels.length === 0) return 0.5;
  const mean = levels.reduce((s, f) => s + f, 0) / levels.length;
  return 1 - Math.abs(patientFitness - mean) / 4;
}

/**
 * Can the patient make the pod's best common time? Max over the patient's
 * slots of the fraction of members available in that slot. Neutral 0.5 when
 * either side declared no availability.
 */
function availabilityScore(patientSlots: Set<string>, memberSlots: Set<string>[]): number {
  if (patientSlots.size === 0 || memberSlots.length === 0) return 0.5;
  let best = 0;
  for (const slot of patientSlots) {
    let sharing = 0;
    for (const set of memberSlots) if (set.has(slot)) sharing++;
    best = Math.max(best, sharing / memberSlots.length);
  }
  return best;
}

/* -------------------------------------------------------------- strategies */

/**
 * Faithful reimplementation of the original inline heuristic: among in-radius
 * pods, the most member-shared interests win (counting members, not distinct
 * slugs — nearly every pod has *somebody* who cycles, but only one is the
 * cycling pod), distance breaks ties.
 */
export const matchNearest: MatchStrategy = (patient, pods) => {
  const mine = toSet(patient.interests);
  return decide(patient, pods, (pod) => {
    let shared = 0;
    for (const member of pod.members) {
      for (const interest of member.interests) if (mine.has(norm(interest))) shared++;
    }
    return shared;
  });
};

/** Exported so the eval harness can report exactly what it measured. */
export const COMPOSITE_WEIGHTS = {
  geo: 0.25,
  goals: 0.2,
  fitness: 0.15,
  availability: 0.15,
  interests: 0.15,
  conditions: 0.1,
} as const;

/**
 * Weighted sum of [0,1] subscores against each pod's member profile —
 * geography leads, then goals, then fitness/availability/interests, with
 * conditions weighted lowest (peer support for the same condition helps, but
 * shouldn't dominate). The size factor multiplies the total so oversized pods
 * lose ground on every axis at once.
 */
export const matchComposite: MatchStrategy = (patient, pods) => {
  const patientSlots = slotSet(patient.availability);
  const w = COMPOSITE_WEIGHTS;
  return decide(patient, pods, (pod, km) => {
    const score =
      w.geo * geoScore(km, patient.travelRadiusKm) +
      w.goals * profileScore(patient.goals, pod.members.map((m) => toSet(m.goals))) +
      w.conditions * profileScore(patient.conditions, pod.members.map((m) => toSet(m.conditions))) +
      w.fitness * fitnessScore(patient.fitnessLevel, pod.members) +
      w.availability * availabilityScore(patientSlots, pod.members.map((m) => slotSet(m.availability))) +
      w.interests * profileScore(patient.interests, pod.members.map((m) => toSet(m.interests)));
    return score * sizeFactor(pod.members.length);
  });
};

/** Exported so the eval harness can report exactly what it measured. */
export const AFFINITY_WEIGHTS = {
  goals: 0.25,
  availability: 0.25,
  interests: 0.2,
  fitness: 0.2,
  conditions: 0.1,
} as const;

/**
 * Person-to-person rather than person-to-profile: the pod's score is the mean
 * pairwise similarity between the patient and each member (Jaccard on
 * goals/interests/conditions/slots, closeness on fitness), scaled by the same
 * geo decay and size factor as the composite. An empty pod scores a neutral
 * 0.5 similarity so it stays in the running.
 */
export const matchAffinity: MatchStrategy = (patient, pods) => {
  const myGoals = toSet(patient.goals);
  const myInterests = toSet(patient.interests);
  const myConditions = toSet(patient.conditions);
  const mySlots = slotSet(patient.availability);
  const w = AFFINITY_WEIGHTS;

  const sim = (member: MatchCandidate): number =>
    w.goals * jaccard(myGoals, toSet(member.goals)) +
    w.interests * jaccard(myInterests, toSet(member.interests)) +
    w.conditions * jaccard(myConditions, toSet(member.conditions)) +
    w.fitness *
      (patient.fitnessLevel === null || member.fitnessLevel === null
        ? 0.5
        : 1 - Math.abs(patient.fitnessLevel - member.fitnessLevel) / 4) +
    w.availability * jaccard(mySlots, slotSet(member.availability));

  return decide(patient, pods, (pod, km) => {
    const base =
      pod.members.length === 0
        ? 0.5
        : pod.members.reduce((s, m) => s + sim(m), 0) / pod.members.length;
    return base * geoScore(km, patient.travelRadiusKm) * sizeFactor(pod.members.length);
  });
};

/**
 * The strategy wired into `POST /api/patients/:id/complete-induction`.
 * `matchComposite` was picked by the offline eval (`bun run eval:matching`);
 * flip this assignment if a re-run of the eval says otherwise.
 */
export const chooseBestPod: MatchStrategy = matchComposite;
