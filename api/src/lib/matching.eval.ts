/**
 * Offline matcher evaluation — no DB, no network. Run from `api/`:
 *
 *     bun run eval:matching
 *
 * Generates seeded fake Hackney users (the same pure generator the demo-user
 * seeder uses), assigns them sequentially to the three demo pods with each
 * strategy — each assignment mutates the chosen pod's member list, so later
 * choices see the evolving composition — and compares cohesion, distance,
 * availability viability and pod balance, averaged over three seeds.
 */
import { generateUsers } from "../seed-users/generator.js";
import { haversineKm } from "./geo.js";
import {
  AFFINITY_WEIGHTS,
  COMPOSITE_WEIGHTS,
  jaccard,
  matchAffinity,
  matchComposite,
  matchNearest,
  slotSet,
} from "./matching.js";
import type { MatchCandidate, MatchPod, MatchStrategy } from "./matching.js";

const CENTER = { lat: 51.545, lng: -0.055 }; // Hackney
const RADIUS_KM = 6;
const COUNT = 300;
const SEEDS = [11, 22, 33];

/** Copied from POD_SEEDS in `src/db/seed.ts` — the three demo pods, empty. */
const POD_DEFS = [
  { id: "walkers", name: "Victoria Park Walkers", lat: 51.5405, lng: -0.0509 },
  { id: "strength", name: "Islington Strength & Balance", lat: 51.5471, lng: -0.109 },
  { id: "cyclists", name: "Regent's Canal Cyclists", lat: 51.5451, lng: -0.1445 },
] as const;

const STRATEGIES: [string, MatchStrategy][] = [
  ["nearest", matchNearest],
  ["composite", matchComposite],
  ["affinity", matchAffinity],
];

/* ----------------------------------------------------------------- metrics */

interface Metrics {
  withinRadiusPct: number;
  meanDistanceKm: number;
  goalCohesion: number;
  interestCohesion: number;
  fitnessSpread: number;
  availabilityViability: number;
  minSize: number;
  maxSize: number;
}

const METRIC_KEYS = [
  "withinRadiusPct",
  "meanDistanceKm",
  "goalCohesion",
  "interestCohesion",
  "fitnessSpread",
  "availabilityViability",
  "minSize",
  "maxSize",
] as const satisfies readonly (keyof Metrics)[];

function meanPairwiseJaccard(sets: Set<string>[]): number {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i]!, sets[j]!);
      pairs++;
    }
  }
  return pairs === 0 ? 0 : sum / pairs;
}

/** Size-weighted mean of a per-pod statistic over pods with ≥ minSize members. */
function sizeWeighted(pods: MatchPod[], minSize: number, f: (pod: MatchPod) => number): number {
  const usable = pods.filter((p) => p.members.length >= minSize);
  const total = usable.reduce((s, p) => s + p.members.length, 0);
  if (total === 0) return 0;
  return usable.reduce((s, p) => s + p.members.length * f(p), 0) / total;
}

function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/** Max over slots of the fraction of members available then — "can this pod meet?". */
function bestSlotFraction(pod: MatchPod): number {
  if (pod.members.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const m of pod.members) {
    for (const slot of slotSet(m.availability)) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  let best = 0;
  for (const n of counts.values()) best = Math.max(best, n / pod.members.length);
  return best;
}

/* --------------------------------------------------------------------- run */

function runStrategy(strategy: MatchStrategy, seed: number): Metrics {
  const users = generateUsers({ center: CENTER, radiusKm: RADIUS_KM, count: COUNT, seed });
  const pods: MatchPod[] = POD_DEFS.map((p) => ({
    id: p.id,
    centroidLat: p.lat,
    centroidLng: p.lng,
    members: [],
  }));
  const podById = new Map(pods.map((p) => [p.id, p] as const));
  const defById = new Map<string, (typeof POD_DEFS)[number]>(POD_DEFS.map((p) => [p.id, p]));

  let within = 0;
  let distanceSum = 0;
  for (const user of users) {
    const candidate: MatchCandidate = {
      lat: user.lat,
      lng: user.lng,
      travelRadiusKm: user.travelRadiusKm,
      fitnessLevel: user.fitnessLevel,
      conditions: user.conditions,
      goals: user.goals,
      interests: user.interests,
      availability: user.availability,
    };
    const decision = strategy(candidate, pods);
    const pod = podById.get(decision.podId!)!;
    const def = defById.get(pod.id)!;
    const km = haversineKm(user.lat, user.lng, def.lat, def.lng);
    distanceSum += km;
    if (km <= user.travelRadiusKm) within++;
    pod.members.push(candidate);
  }

  const sizes = pods.map((p) => p.members.length);
  return {
    withinRadiusPct: (100 * within) / users.length,
    meanDistanceKm: distanceSum / users.length,
    goalCohesion: sizeWeighted(pods, 2, (p) =>
      meanPairwiseJaccard(p.members.map((m) => new Set(m.goals))),
    ),
    interestCohesion: sizeWeighted(pods, 2, (p) =>
      meanPairwiseJaccard(p.members.map((m) => new Set(m.interests))),
    ),
    fitnessSpread:
      pods.length === 0
        ? 0
        : pods.reduce(
            (s, p) =>
              s +
              populationStdDev(
                p.members.map((m) => m.fitnessLevel).filter((f): f is number => f !== null),
              ),
            0,
          ) / pods.length,
    availabilityViability: sizeWeighted(pods, 1, bestSlotFraction),
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
  };
}

function averageOverSeeds(strategy: MatchStrategy): Metrics {
  const runs = SEEDS.map((seed) => runStrategy(strategy, seed));
  const avg = {} as Metrics;
  for (const key of METRIC_KEYS) {
    avg[key] = runs.reduce((s, r) => s + r[key], 0) / runs.length;
  }
  return avg;
}

/* ------------------------------------------------------------- comparison */

/** Min-max normalize a metric across strategies; 0.5 when they all tie. */
function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v) => (max === min ? 0.5 : (v - min) / (max - min)));
}

const UP_METRICS = ["withinRadiusPct", "goalCohesion", "interestCohesion", "availabilityViability"] as const;
const DOWN_METRICS = ["meanDistanceKm", "fitnessSpread"] as const;

function aggregates(results: Metrics[]): number[] {
  const parts: number[][] = [];
  for (const key of UP_METRICS) parts.push(normalize(results.map((r) => r[key])));
  for (const key of DOWN_METRICS) parts.push(normalize(results.map((r) => r[key])).map((n) => 1 - n));
  return results.map((_, i) => parts.reduce((s, p) => s + p[i]!, 0) / parts.length);
}

/* ------------------------------------------------------------------ report */

const results = STRATEGIES.map(([, strategy]) => averageOverSeeds(strategy));
const scores = aggregates(results);

console.log(
  `Matcher evaluation — ${COUNT} generated users x seeds [${SEEDS.join(", ")}], ` +
    `center ${CENTER.lat},${CENTER.lng}, radius ${RADIUS_KM}km, 3 demo pods starting empty`,
);
console.log(`composite weights: ${JSON.stringify(COMPOSITE_WEIGHTS)}`);
console.log(`affinity weights:  ${JSON.stringify(AFFINITY_WEIGHTS)}`);
console.log("");

const header = [
  "strategy".padEnd(10),
  "within%".padStart(8),
  "meanKm".padStart(7),
  "goalCoh".padStart(8),
  "intCoh".padStart(7),
  "fitSpread".padStart(10),
  "availViab".padStart(10),
  "sizes".padStart(12),
  "aggregate".padStart(10),
].join("  ");
console.log(header);
console.log("-".repeat(header.length));
STRATEGIES.forEach(([name], i) => {
  const m = results[i]!;
  console.log(
    [
      name.padEnd(10),
      m.withinRadiusPct.toFixed(1).padStart(8),
      m.meanDistanceKm.toFixed(2).padStart(7),
      m.goalCohesion.toFixed(3).padStart(8),
      m.interestCohesion.toFixed(3).padStart(7),
      m.fitnessSpread.toFixed(3).padStart(10),
      m.availabilityViability.toFixed(3).padStart(10),
      `${m.minSize.toFixed(1)}–${m.maxSize.toFixed(1)}`.padStart(12),
      scores[i]!.toFixed(3).padStart(10),
    ].join("  "),
  );
});

console.log("");
console.log(
  "aggregate = mean( norm(within%), norm(goalCoh), norm(intCoh), norm(availViab), " +
    "1-norm(meanKm), 1-norm(fitSpread) ), norm = min-max across strategies",
);

const bestIndex = scores.reduce((best, s, i) => (s > scores[best]! ? i : best), 0);
const ranked = STRATEGIES.map(([name], i) => `${name} ${scores[i]!.toFixed(3)}`).join(", ");
console.log(`Verdict: ${STRATEGIES[bestIndex]![0]} ranks best on the aggregate (${ranked})`);
