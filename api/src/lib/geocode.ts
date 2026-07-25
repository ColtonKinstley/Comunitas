export interface GeocodeResult {
  postcode: string;
  lat: number;
  lng: number;
}

const POSTCODES_IO = "https://api.postcodes.io/postcodes";

/**
 * Resolve a UK postcode to coordinates via postcodes.io (free, no key).
 * Returns null on any failure — callers persist the postcode regardless and
 * surface a warning, per the spec's "geocode failure → save without lat/lng".
 */
export async function geocodePostcode(raw: string): Promise<GeocodeResult | null> {
  const postcode = raw.trim();
  if (!postcode) return null;

  try {
    const res = await fetch(`${POSTCODES_IO}/${encodeURIComponent(postcode)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      status?: number;
      result?: { postcode?: string; latitude?: number; longitude?: number } | null;
    };
    const result = body.result;
    if (
      !result ||
      typeof result.latitude !== "number" ||
      typeof result.longitude !== "number"
    ) {
      return null;
    }
    return {
      postcode: result.postcode ?? postcode.toUpperCase(),
      lat: result.latitude,
      lng: result.longitude,
    };
  } catch {
    return null;
  }
}
