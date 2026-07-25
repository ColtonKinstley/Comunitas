/**
 * Client-side geography for the pod screen. We only ever need "how far is the
 * meeting area from me?", so a haversine over the map endpoint's coordinates
 * beats another round trip.
 */

export interface Coord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coord, b: Coord): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Returns `null` when either point is missing coordinates. */
export function distanceBetween(
  a: { lat: number | null; lng: number | null } | null | undefined,
  b: { lat: number | null; lng: number | null } | null | undefined,
): number | null {
  if (!a || !b) return null;
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return null;
  return haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}

/** Under a kilometre reads better in metres, rounded to something believable. */
export function formatDistance(km: number): string {
  if (km < 0.1) return "a couple of minutes away";
  if (km < 1) return `${Math.round((km * 1000) / 50) * 50} m away`;
  return `${km.toFixed(1)} km away`;
}

/** Rough walking time at a gentle 4 km/h — this audience is not sprinting. */
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4) * 60));
}

/** The venues a pod actually uses, most-used first. */
export function frequentVenues(
  events: { venueName: string | null }[],
  limit = 3,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const name = event.venueName?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
