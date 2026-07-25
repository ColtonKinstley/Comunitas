/**
 * Marker icons for the community map.
 *
 * Leaflet's default marker is a PNG resolved relative to the CSS file, which
 * Vite's bundling breaks. Everything here is a `DivIcon` built from inline
 * markup instead, so there are no image assets to lose and each layer gets its
 * own unmistakable shape: a haloed circle for you, a teardrop pin for events, a
 * rounded badge for the pod meeting point, a small dot for pod members.
 */
import { divIcon, type DivIcon } from "leaflet";
import { MAP_COLORS } from "./theme";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Member first names come from the API, so they never go into HTML raw. */
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

const RING = `0 2px 6px rgb(29 35 32 / 0.35)`;

/** You are here: brand circle, white ring, soft pulsing halo. */
export const youIcon: DivIcon = divIcon({
  className: "comunitas-marker",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -20],
  html: `
    <span style="position:relative;display:block;width:42px;height:42px;">
      <span class="comunitas-halo" aria-hidden="true"></span>
      <span style="
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        border-radius:50%;
        background:${MAP_COLORS.you};border:4px solid ${MAP_COLORS.surface};
        box-shadow:${RING};">
        <span style="width:12px;height:12px;border-radius:50%;background:${MAP_COLORS.surface};"></span>
      </span>
    </span>`,
});

/** Event venue: amber teardrop, drawn as SVG so the point lands on the venue. */
export const eventIcon: DivIcon = divIcon({
  className: "comunitas-marker",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -38],
  html: `
    <svg width="32" height="42" viewBox="0 0 24 32" aria-hidden="true">
      <path
        d="M12 1C6.2 1 1.5 5.7 1.5 11.5C1.5 19.6 12 30.5 12 30.5S22.5 19.6 22.5 11.5C22.5 5.7 17.8 1 12 1Z"
        fill="${MAP_COLORS.event}" stroke="${MAP_COLORS.surface}" stroke-width="2.2"
        stroke-linejoin="round" />
      <rect x="7" y="7.5" width="10" height="9.5" rx="2"
        fill="none" stroke="${MAP_COLORS.surface}" stroke-width="1.9" />
      <path d="M7 11h10M9.5 6v3M14.5 6v3"
        stroke="${MAP_COLORS.surface}" stroke-width="1.9" stroke-linecap="round" />
    </svg>`,
});

/** Where the pod meets: a squared-off badge, deliberately unlike the round "you". */
export const podCentroidIcon: DivIcon = divIcon({
  className: "comunitas-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  html: `
    <span style="
      display:flex;align-items:center;justify-content:center;
      width:40px;height:40px;border-radius:13px;
      background:${MAP_COLORS.pod};border:3px solid ${MAP_COLORS.surface};
      box-shadow:${RING};">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="${MAP_COLORS.surface}" stroke-width="2.1"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 20v-1.6a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.4V20" />
        <circle cx="9" cy="7.6" r="3.4" />
        <path d="M21 20v-1.6a3.6 3.6 0 0 0-2.8-3.5" />
        <path d="M16.4 4.2a3.6 3.6 0 0 1 0 6.8" />
      </svg>
    </span>`,
});

/**
 * A pod member's approximate area, labelled with their first name. No size is
 * given so the label can be as wide as the name needs; the anchor points at the
 * dot rather than the middle of the label.
 */
export const memberIcon = (firstName: string): DivIcon =>
  divIcon({
    className: "comunitas-marker comunitas-member",
    iconSize: undefined,
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
    html: `
      <span style="display:flex;align-items:center;gap:5px;white-space:nowrap;">
        <span style="
          flex:none;width:16px;height:16px;border-radius:50%;
          background:${MAP_COLORS.member};border:2.5px solid ${MAP_COLORS.surface};
          box-shadow:0 1px 4px rgb(29 35 32 / 0.3);"></span>
        <span style="
          font-size:12px;font-weight:700;line-height:1.2;color:${MAP_COLORS.ink};
          background:rgb(255 255 255 / 0.9);padding:2px 7px;border-radius:999px;
          box-shadow:0 1px 3px rgb(29 35 32 / 0.16);">${escapeHtml(firstName)}</span>
      </span>`,
  });
