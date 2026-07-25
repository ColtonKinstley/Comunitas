/**
 * Leaflet ships its own type scale, which is far too small for this audience,
 * and its `.leaflet-div-icon` default paints a white box behind every marker.
 * These overrides live with the map feature rather than in the global stylesheet
 * so nothing else has to know about Leaflet's class names.
 */
import { MAP_COLORS } from "./theme";

const CSS = `
.leaflet-container {
  font-family: inherit;
  font-size: 15px;
  background: ${MAP_COLORS.backdrop};
}

/* Our DivIcons paint themselves — strip Leaflet's default white chip.
   Never set a position here: Leaflet absolutely positions .leaflet-marker-icon
   itself, and this rule would win on specificity and drop every marker into
   normal flow (they then render tens of pixels away from their real location). */
.comunitas-marker {
  background: none;
  border: 0;
}
.comunitas-member { z-index: 300 !important; }

.comunitas-halo {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  background: ${MAP_COLORS.youSoft};
  opacity: 0.22;
  animation: comunitas-pulse 2.6s ease-in-out infinite;
}
@keyframes comunitas-pulse {
  0%, 100% { transform: scale(0.86); opacity: 0.3; }
  50% { transform: scale(1.16); opacity: 0.1; }
}
@media (prefers-reduced-motion: reduce) {
  .comunitas-halo { animation: none; }
}

.leaflet-popup-content-wrapper {
  border-radius: 18px;
  box-shadow: 0 6px 26px rgb(29 35 32 / 0.22);
  color: ${MAP_COLORS.ink};
}
.leaflet-popup-content {
  margin: 15px 16px 15px 16px;
  font-size: 15px;
  line-height: 1.5;
}
.leaflet-container a.leaflet-popup-close-button {
  width: 34px;
  height: 34px;
  padding: 7px 7px 0 0;
  font-size: 22px;
  color: ${MAP_COLORS.inkSoft};
}
.leaflet-popup-tip { box-shadow: none; }

.leaflet-control-attribution {
  font-size: 11px;
  background: rgb(255 255 255 / 0.86);
  padding: 2px 7px;
  border-radius: 8px 0 0 0;
}
.leaflet-control-attribution a { color: ${MAP_COLORS.inkSoft}; }
`;

export function MapStyles() {
  return <style>{CSS}</style>;
}
