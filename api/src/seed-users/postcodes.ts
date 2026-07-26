/**
 * Bulk reverse-geocode via postcodes.io (max 100 geolocations per request).
 * Best-effort: any failure degrades to nulls; the schema tolerates missing
 * postcodes and non-UK regions will never resolve.
 */
export async function assignPostcodes(
  points: { lat: number; lng: number }[],
): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(points.length).fill(null);
  for (let offset = 0; offset < points.length; offset += 100) {
    const chunk = points.slice(offset, offset + 100);
    try {
      const res = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geolocations: chunk.map((p) => ({ latitude: p.lat, longitude: p.lng, limit: 1, radius: 1000 })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.warn(`[seed-users] postcode lookup failed for chunk at ${offset}: HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as {
        result?: { result?: { postcode?: string }[] | null }[];
      };
      body.result?.forEach((entry, i) => {
        out[offset + i] = entry.result?.[0]?.postcode ?? null;
      });
    } catch (err) {
      console.warn(`[seed-users] postcode lookup failed for chunk at ${offset}`, err);
    }
  }
  return out;
}
