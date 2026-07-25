/**
 * Leaflet builds markers from raw HTML strings inside a canvas it owns, so it
 * can't use Tailwind classes. These are hex mirrors of the tokens in
 * `src/index.css` — keep them in step if the palette moves.
 */
export const MAP_COLORS = {
  /** brand-600 — "you". */
  you: "#3a7434",
  /** brand-500 — travel radius fill + the halo behind "you". */
  youSoft: "#4a8f41",
  /** accent-500 — event venues. */
  event: "#d2851f",
  /** brand-700 — where the pod meets. */
  pod: "#2f5c2b",
  /** brand-400 — pod member dots. */
  member: "#71ad63",
  surface: "#ffffff",
  ink: "#1d2320",
  inkSoft: "#56615a",
  /** page — the backdrop showing through while tiles load. */
  backdrop: "#ece6da",
} as const;

/** Rough metres-per-degree conversions, good enough for fitting bounds. */
export const KM_PER_DEGREE_LAT = 110.574;
