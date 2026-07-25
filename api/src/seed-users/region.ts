import { geocodePostcode } from "../lib/geocode.js";

const FULL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export function classifyRegionInput(input: string): { kind: "postcode" | "outcode" | "place"; value: string } {
  const trimmed = input.trim();
  if (FULL_POSTCODE_RE.test(trimmed)) return { kind: "postcode", value: trimmed.toUpperCase() };
  if (OUTCODE_RE.test(trimmed)) return { kind: "outcode", value: trimmed.toUpperCase() };
  return { kind: "place", value: trimmed };
}

export async function resolveRegion(input: string): Promise<{ lat: number; lng: number; label: string }> {
  const { kind, value } = classifyRegionInput(input);
  if (kind === "postcode") {
    const hit = await geocodePostcode(value);
    if (hit) return { lat: hit.lat, lng: hit.lng, label: hit.postcode };
  } else if (kind === "outcode") {
    try {
      const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(value)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const body = (await res.json()) as { result?: { latitude?: number; longitude?: number } | null };
        if (typeof body.result?.latitude === "number" && typeof body.result?.longitude === "number") {
          return { lat: body.result.latitude, lng: body.result.longitude, label: value };
        }
      }
    } catch { /* fall through to error below */ }
  } else {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", value);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const res = await fetch(url, {
        // Nominatim usage policy requires an identifying User-Agent.
        headers: { "User-Agent": "comunitas-seeder/1.0 (hackathon demo)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const body = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
        const hit = body[0];
        if (hit?.lat && hit.lon) {
          return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name ?? value };
        }
      }
    } catch { /* fall through to error below */ }
  }
  throw new Error(`could not resolve region: ${input}`);
}
