import { describe, expect, test } from "bun:test";
import { Rng, sampleCoords } from "./rng.js";

describe("Rng", () => {
  test("same seed reproduces the same sequence", () => {
    const a = new Rng("hackney-42");
    const b = new Rng("hackney-42");
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  test("different seeds diverge", () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  test("int stays in bounds inclusive", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  test("weighted respects zero weights", () => {
    const rng = new Rng(9);
    for (let i = 0; i < 200; i++) {
      expect(rng.weighted([["a", 0], ["b", 1]] as const)).toBe("b");
    }
  });

  test("sample returns n distinct elements", () => {
    const rng = new Rng(3);
    const s = rng.sample([1, 2, 3, 4, 5], 3);
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});

describe("sampleCoords", () => {
  test("all points fall inside the radius", () => {
    const rng = new Rng("geo");
    const center = { lat: 51.545, lng: -0.055 }; // Hackney
    const pts = sampleCoords(rng, center, 3, 300);
    expect(pts).toHaveLength(300);
    for (const p of pts) {
      const dLat = (p.lat - center.lat) * 110.574;
      const dLng = (p.lng - center.lng) * 111.32 * Math.cos((center.lat * Math.PI) / 180);
      expect(Math.hypot(dLat, dLng)).toBeLessThanOrEqual(3.0001);
    }
  });

  test("points cluster rather than spread uniformly", () => {
    // With clustering, mean pairwise distance is well below the uniform-disk
    // expectation (~0.9054 * r). Guards against regressing to uniform dust.
    const rng = new Rng("cluster-check");
    const pts = sampleCoords(rng, { lat: 51.5, lng: -0.1 }, 4, 200);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < pts.length; i += 5) {
      for (let j = i + 5; j < pts.length; j += 5) {
        const dLat = (pts[i]!.lat - pts[j]!.lat) * 110.574;
        const dLng = (pts[i]!.lng - pts[j]!.lng) * 111.32 * Math.cos((51.5 * Math.PI) / 180);
        sum += Math.hypot(dLat, dLng);
        n++;
      }
    }
    expect(sum / n).toBeLessThan(0.85 * 4);
  });
});
