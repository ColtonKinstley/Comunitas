/** FNV-1a: string seed -> uint32, so "hackney-42" style seeds are stable. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, fast, good-enough PRNG; determinism is the point. */
export class Rng {
  private state: number;

  constructor(seed: number | string) {
    this.state = (typeof seed === "string" ? hashSeed(seed) : seed >>> 0) || 1;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [value, w] of items) {
      r -= w;
      if (r < 0) return value;
    }
    return items[items.length - 1]![0];
  }

  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  gaussian(mean: number, sd: number): number {
    // Box-Muller; guard against log(0).
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

const KM_PER_DEG_LAT = 110.574;

/**
 * Sample points inside the radius with 2-4 gaussian sub-clusters — people
 * bunch around high streets and estates; a uniform disk looks fake on the map.
 */
export function sampleCoords(
  rng: Rng,
  center: { lat: number; lng: number },
  radiusKm: number,
  count: number,
): { lat: number; lng: number }[] {
  const kmPerDegLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const clusterCount = rng.int(2, 4);
  const clusters: { x: number; y: number; weight: number }[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const r = radiusKm * 0.6 * Math.sqrt(rng.next());
    const theta = rng.next() * 2 * Math.PI;
    clusters.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), weight: 1 + rng.next() * 2 });
  }

  const points: { lat: number; lng: number }[] = [];
  while (points.length < count) {
    const c = rng.weighted(clusters.map((cl) => [cl, cl.weight] as const));
    const x = c.x + rng.gaussian(0, radiusKm / 4);
    const y = c.y + rng.gaussian(0, radiusKm / 4);
    if (Math.hypot(x, y) > radiusKm) continue; // resample outside the radius
    points.push({ lat: center.lat + y / KM_PER_DEG_LAT, lng: center.lng + x / kmPerDegLng });
  }
  return points;
}
