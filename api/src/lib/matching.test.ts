import { describe, expect, test } from "bun:test";
import {
  chooseBestPod,
  matchAffinity,
  matchComposite,
  matchNearest,
} from "./matching.js";
import type { MatchCandidate, MatchPod, MatchStrategy } from "./matching.js";

/**
 * Coordinate helpers around a fixed base point. `north` moves along a
 * meridian (km is exact); `east`/`west` move along the base parallel, which
 * keeps two pods at ±d exactly equidistant from the patient — handy for
 * isolating a single subscore from geography.
 */
const BASE = { lat: 51.5, lng: -0.05 };
const north = (km: number) => ({ lat: BASE.lat + km / 110.574, lng: BASE.lng });
const east = (km: number) => ({ lat: BASE.lat, lng: BASE.lng + km / 69.3 });
const west = (km: number) => east(-km);

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  lat: BASE.lat,
  lng: BASE.lng,
  travelRadiusKm: 3,
  fitnessLevel: 3,
  conditions: [],
  goals: [],
  interests: [],
  availability: {},
  ...over,
});

const pod = (
  id: string,
  at: { lat: number; lng: number } | null,
  members: MatchCandidate[] = [],
): MatchPod => ({
  id,
  centroidLat: at?.lat ?? null,
  centroidLng: at?.lng ?? null,
  members,
});

const STRATEGIES: [string, MatchStrategy][] = [
  ["matchNearest", matchNearest],
  ["matchComposite", matchComposite],
  ["matchAffinity", matchAffinity],
];

describe("radius gating (all strategies)", () => {
  // A perfectly-matching pod outside the travel radius must lose to any pod
  // inside it — geography gates before fit is even considered.
  const patient = candidate({ interests: ["cycling"], goals: ["improve_fitness"] });
  const perfectMember = candidate({ interests: ["cycling"], goals: ["improve_fitness"] });
  const inRange = pod("near", north(2), [candidate({ interests: ["crafts"] })]);
  const outOfRange = pod("far", north(5), [perfectMember, perfectMember]);

  for (const [name, strategy] of STRATEGIES) {
    test(`${name}: in-radius pod beats a better-matching out-of-radius pod`, () => {
      expect(strategy(patient, [outOfRange, inRange]).podId).toBe("near");
    });

    test(`${name}: nearest pod wins outright when nothing is in range`, () => {
      const decision = strategy(patient, [pod("a", north(9)), pod("b", north(5))]);
      expect(decision.podId).toBe("b");
      expect(decision.distanceKm).toBeCloseTo(5, 1);
    });
  }
});

describe("cohesion preference", () => {
  // Both pods in radius; the nearer one mismatches on goals and availability,
  // the slightly farther one matches. Interests overlap with neither, so the
  // baseline sees a tie and falls back to pure distance — the point of the
  // richer strategies is that they don't.
  const patient = candidate({
    goals: ["lose_weight"],
    interests: ["walking"],
    availability: { mon: ["morning"] },
  });
  const mismatch = candidate({
    goals: ["better_sleep"],
    interests: ["crafts"],
    availability: { tue: ["evening"] },
  });
  const match = candidate({
    goals: ["lose_weight"],
    interests: ["crafts"],
    availability: { mon: ["morning"] },
  });
  const podsList = [
    pod("nearer-mismatch", north(1), [mismatch, mismatch]),
    pod("farther-match", north(1.5), [match, match]),
  ];

  test("matchComposite prefers the cohesive pod over the slightly nearer one", () => {
    expect(matchComposite(patient, podsList).podId).toBe("farther-match");
  });

  test("matchAffinity prefers the cohesive pod over the slightly nearer one", () => {
    expect(matchAffinity(patient, podsList).podId).toBe("farther-match");
  });

  test("matchNearest (baseline) still just takes the nearer pod", () => {
    expect(matchNearest(patient, podsList).podId).toBe("nearer-mismatch");
  });
});

describe("fitness proximity", () => {
  // Equidistant pods, identical tags — only member fitness differs.
  const patient = candidate({ fitnessLevel: 2, goals: ["improve_fitness"] });
  const gentle = candidate({ fitnessLevel: 2, goals: ["improve_fitness"] });
  const athletic = candidate({ fitnessLevel: 5, goals: ["improve_fitness"] });
  const podsList = [
    pod("athletic", east(1), [athletic, athletic]),
    pod("gentle", west(1), [gentle, gentle]),
  ];

  test("matchComposite picks the pod whose fitness matches", () => {
    expect(matchComposite(patient, podsList).podId).toBe("gentle");
  });

  test("matchAffinity picks the pod whose fitness matches", () => {
    expect(matchAffinity(patient, podsList).podId).toBe("gentle");
  });
});

describe("availability", () => {
  // Equidistant pods, identical otherwise — only shared slots differ.
  const patient = candidate({ availability: { sat: ["morning"] } });
  const sameSlot = candidate({ availability: { sat: ["morning"] } });
  const otherSlot = candidate({ availability: { wed: ["evening"] } });
  const podsList = [
    pod("weekday", east(1), [otherSlot, otherSlot]),
    pod("weekend", west(1), [sameSlot, sameSlot]),
  ];

  test("matchComposite picks the pod the patient can actually attend", () => {
    expect(matchComposite(patient, podsList).podId).toBe("weekend");
  });

  test("matchAffinity picks the pod the patient can actually attend", () => {
    expect(matchAffinity(patient, podsList).podId).toBe("weekend");
  });
});

describe("slug normalization", () => {
  test("matchNearest matches interests case- and whitespace-insensitively", () => {
    const patient = candidate({ interests: [" Walking "] });
    const walker = candidate({ interests: ["walking"] });
    const crafter = candidate({ interests: ["crafts"] });
    const decision = matchNearest(patient, [
      pod("crafts", east(1), [crafter]),
      pod("walking", west(1), [walker]),
    ]);
    expect(decision.podId).toBe("walking");
  });
});

describe("fallbacks", () => {
  const noCoords = candidate({ lat: null, lng: null });

  for (const [name, strategy] of STRATEGIES) {
    test(`${name}: no coordinates falls back to the smallest pod`, () => {
      const decision = strategy(noCoords, [
        pod("big", north(1), [candidate(), candidate()]),
        pod("small", north(2), [candidate()]),
      ]);
      expect(decision.podId).toBe("small");
      expect(decision.distanceKm).toBeNull();
    });

    test(`${name}: smallest-pod ties break on pod id`, () => {
      const decision = strategy(noCoords, [
        pod("b", north(1), [candidate()]),
        pod("a", north(2), [candidate()]),
      ]);
      expect(decision.podId).toBe("a");
    });

    test(`${name}: no pods at all returns a null decision`, () => {
      expect(strategy(candidate(), [])).toEqual({ podId: null, distanceKm: null });
    });

    test(`${name}: unlocated pods still get chosen when nothing has a centroid`, () => {
      expect(strategy(candidate(), [pod("only", null)]).podId).toBe("only");
    });
  }
});

describe("determinism and totality", () => {
  const patient = candidate({
    goals: ["lose_weight"],
    interests: ["walking", "swimming"],
    availability: { mon: ["morning"], sat: ["afternoon"] },
  });
  const podsList = [
    pod("a", north(1), [candidate({ interests: ["walking"] })]),
    pod("b", north(2), [candidate({ goals: ["lose_weight"] })]),
    pod("c", north(2.5), []),
  ];

  for (const [name, strategy] of STRATEGIES) {
    test(`${name}: same inputs give the same decision`, () => {
      expect(strategy(patient, podsList)).toEqual(strategy(patient, podsList));
    });

    test(`${name}: always returns a pod from the given set`, () => {
      const decision = strategy(patient, podsList);
      expect(decision.podId).not.toBeNull();
      expect(podsList.map((p) => p.id)).toContain(decision.podId!);
      expect(decision.distanceKm).not.toBeNull();
    });
  }

  test("chooseBestPod behaves like a strategy over the same set", () => {
    const decision = chooseBestPod(patient, podsList);
    expect(decision.podId).not.toBeNull();
    expect(podsList.map((p) => p.id)).toContain(decision.podId!);
  });
});
