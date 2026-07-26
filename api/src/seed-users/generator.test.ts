import { describe, expect, test } from "bun:test";
import { generateUsers } from "./generator.js";
import { CONDITION_WEIGHTS_BY_BAND, GOAL_SLUGS, INTEREST_SLUGS } from "./data.js";

const OPTS = { center: { lat: 51.545, lng: -0.055 }, radiusKm: 3, count: 250, seed: "test-1" };
const CONDITION_SLUGS = CONDITION_WEIGHTS_BY_BAND["45-59"].map(([slug]) => slug);

describe("generateUsers", () => {
  test("deterministic for the same seed", () => {
    expect(generateUsers(OPTS)).toEqual(generateUsers(OPTS));
  });

  test("different seed produces different users", () => {
    const a = generateUsers(OPTS);
    const b = generateUsers({ ...OPTS, seed: "test-2" });
    expect(a.map((u) => u.name).join()).not.toBe(b.map((u) => u.name).join());
  });

  test("returns exactly count users with valid fields", () => {
    const users = generateUsers(OPTS);
    expect(users).toHaveLength(250);
    for (const u of users) {
      expect(u.name).toMatch(/^\S+ \S+/);
      expect(u.fitnessLevel).toBeGreaterThanOrEqual(1);
      expect(u.fitnessLevel).toBeLessThanOrEqual(5);
      expect(u.confidenceLevel).toBeGreaterThanOrEqual(1);
      expect(u.confidenceLevel).toBeLessThanOrEqual(5);
      expect(u.interests.length).toBeGreaterThanOrEqual(2);
      expect(u.goals.length).toBeGreaterThanOrEqual(1);
      expect(u.travelRadiusKm).toBeGreaterThanOrEqual(1);
      for (const c of u.conditions) expect(CONDITION_SLUGS).toContain(c);
      for (const g of u.goals) expect(GOAL_SLUGS).toContain(g);
      for (const i of u.interests) expect(INTEREST_SLUGS).toContain(i);
      expect(new Set(u.conditions).size).toBe(u.conditions.length);
      expect(new Set(u.goals).size).toBe(u.goals.length);
      expect(new Set(u.interests).size).toBe(u.interests.length);
    }
  });

  test("condition mix varies by age band", () => {
    const users = generateUsers({ ...OPTS, count: 400, seed: "band-mix" });
    const young = users.filter((u) => u.ageBand === "18-29" || u.ageBand === "30-44");
    const old = users.filter((u) => u.ageBand === "60-74" || u.ageBand === "75+");
    const rate = (xs: typeof users, slug: string) =>
      xs.filter((u) => u.conditions.includes(slug)).length / Math.max(xs.length, 1);
    expect(rate(old, "arthritis")).toBeGreaterThan(rate(young, "arthritis"));
    expect(rate(young, "anxiety")).toBeGreaterThan(rate(old, "anxiety"));
  });
});
