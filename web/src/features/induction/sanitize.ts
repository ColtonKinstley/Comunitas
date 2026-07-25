/**
 * The model is a language model, not a JSON schema validator — it will
 * occasionally hand us `conditions: ["diabetes"]`, `fitnessLevel: "2"`, or a
 * key we never asked for. `PATCH /api/patients/:id/profile` is a *strict* zod
 * schema, so one stray key would 400 the whole update and stall the induction.
 *
 * Everything the tool sends therefore goes through here first: whitelist the
 * keys, coerce the obvious mistakes, drop anything that still doesn't fit.
 */
import type {
  AgeBand,
  Availability,
  DayKey,
  Tag,
  TimeSlot,
  TransportMode,
  UpdateProfileBody,
} from "../../lib/types";

const AGE_BANDS: AgeBand[] = ["18-29", "30-44", "45-59", "60-74", "75+"];
const TRANSPORT_MODES: TransportMode[] = ["walk", "cycle", "bus", "tube", "car"];
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SLOTS: TimeSlot[] = ["morning", "afternoon", "evening"];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
};

const int = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** `"Type 2 Diabetes"` → `type_2_diabetes`; already-slugged input passes through. */
export const toSlug = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);

/** Accepts `["walking"]`, `[{slug, note}]`, or a mixture of the two. */
function tags(value: unknown): Tag[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Tag[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    let slug: string | undefined;
    let note: string | null = null;
    if (typeof entry === "string") {
      slug = toSlug(entry);
    } else if (isRecord(entry)) {
      const raw = entry.slug ?? entry.name ?? entry.value ?? entry.condition ?? entry.goal ?? entry.interest;
      if (typeof raw === "string") slug = toSlug(raw);
      note = text(entry.note ?? entry.notes ?? entry.detail, 500) ?? null;
    }
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(note ? { slug, note } : { slug });
  }
  return out;
}

function availability(value: unknown): Availability | undefined {
  if (!isRecord(value)) return undefined;
  const out: Availability = {};
  let any = false;
  for (const day of DAYS) {
    const raw = value[day];
    if (!Array.isArray(raw)) continue;
    const slots = raw
      .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
      .filter((s): s is TimeSlot => (SLOTS as string[]).includes(s));
    const unique = [...new Set(slots)];
    if (unique.length) {
      out[day] = unique;
      any = true;
    }
  }
  return any ? out : undefined;
}

function transport(value: unknown): TransportMode[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const modes = value
    .map((m) => (typeof m === "string" ? m.trim().toLowerCase() : ""))
    // Common near-misses from the model.
    .map((m) => (m === "walking" ? "walk" : m === "cycling" || m === "bike" ? "cycle" : m))
    .map((m) => (m === "driving" ? "car" : m === "underground" ? "tube" : m))
    .filter((m): m is TransportMode => (TRANSPORT_MODES as string[]).includes(m));
  const unique = [...new Set(modes)];
  return unique.length ? unique : undefined;
}

/**
 * Whitelist + coerce a raw `update_profile` payload into a body the API will
 * accept. Anything unrecognised is silently dropped — a partial save always
 * beats a failed one mid-conversation.
 */
export function sanitizeProfilePatch(raw: unknown): UpdateProfileBody {
  if (!isRecord(raw)) return {};
  const out: UpdateProfileBody = {};

  const name = text(raw.name, 120);
  if (name) out.name = name;

  if (typeof raw.ageBand === "string" && (AGE_BANDS as string[]).includes(raw.ageBand)) {
    out.ageBand = raw.ageBand as AgeBand;
  }

  const postcode = text(raw.postcode, 12);
  // postcodes.io wants at least an outward code; below 2 chars is noise.
  if (postcode && postcode.length >= 2) out.postcode = postcode.toUpperCase();

  const radius = int(raw.travelRadiusKm, 1, 50);
  if (radius !== undefined) out.travelRadiusKm = radius;

  const modes = transport(raw.transportModes);
  if (modes) out.transportModes = modes;

  const mobility = text(raw.mobilityNotes, 1000);
  if (mobility) out.mobilityNotes = mobility;

  const confidence = int(raw.confidenceLevel, 1, 5);
  if (confidence !== undefined) out.confidenceLevel = confidence;

  const fitness = int(raw.fitnessLevel, 1, 5);
  if (fitness !== undefined) out.fitnessLevel = fitness;

  const fitnessNotes = text(raw.fitnessNotes, 1000);
  if (fitnessNotes) out.fitnessNotes = fitnessNotes;

  const avail = availability(raw.availability);
  if (avail) out.availability = avail;

  // Array fields are full replaces — an explicit empty array is meaningful
  // ("no conditions"), so keep it.
  const conditions = tags(raw.conditions);
  if (conditions) out.conditions = conditions;
  const goals = tags(raw.goals);
  if (goals) out.goals = goals;
  const interests = tags(raw.interests);
  if (interests) out.interests = interests;

  return out;
}

export const isEmptyPatch = (patch: UpdateProfileBody) => Object.keys(patch).length === 0;
