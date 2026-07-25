const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. Good enough for "which London pod is nearest". */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const roundKm = (km: number) => Math.round(km * 100) / 100;

/**
 * Blur a member's coordinates to roughly street/postcode level (~150–250m) so
 * the map can show "people near you" without exposing anyone's front door.
 * Deterministic in the seed id so markers do not jump between requests.
 */
export function jitterCoord(
  lat: number | null,
  lng: number | null,
  seed: string,
): { lat: number | null; lng: number | null } {
  if (lat === null || lng === null) return { lat: null, lng: null };
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 10) % 1000) / 1000;
  const dLat = (a - 0.5) * 0.004; // ~±220m
  const dLng = (b - 0.5) * 0.006; // ~±210m at this latitude
  return {
    lat: Math.round((lat + dLat) * 1e5) / 1e5,
    lng: Math.round((lng + dLng) * 1e5) / 1e5,
  };
}
