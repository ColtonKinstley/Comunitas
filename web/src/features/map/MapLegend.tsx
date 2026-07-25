/**
 * The card floating over the top of the map: what the shapes mean, and a way to
 * quieten a layer down. Chips are real buttons at 44px so they're honest touch
 * targets rather than decoration.
 */
import type { ReactNode } from "react";
import { MAP_COLORS } from "./theme";

export interface MapLayers {
  you: boolean;
  events: boolean;
  pod: boolean;
}

export const ALL_LAYERS: MapLayers = { you: true, events: true, pod: true };

interface MapLegendProps {
  /** e.g. "Within 3 km of E9 6HB". */
  subtitle: string;
  layers: MapLayers;
  onToggle: (layer: keyof MapLayers) => void;
  counts: { events: number; members: number };
}

export function MapLegend({ subtitle, layers, onToggle, counts }: MapLegendProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-3 pt-3">
      <div className="pointer-events-auto rounded-2xl border border-line bg-surface/95 px-3.5 py-3 shadow-card backdrop-blur">
        <h1 className="text-base leading-tight font-bold text-ink">Your community around you</h1>
        <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <LegendChip
            label="You"
            active={layers.you}
            onClick={() => onToggle("you")}
            swatch={<span className="size-4 rounded-full bg-brand-600" />}
          />
          <LegendChip
            label={`Events${counts.events ? ` ${counts.events}` : ""}`}
            active={layers.events}
            onClick={() => onToggle("events")}
            swatch={<Pin />}
          />
          <LegendChip
            label={`Pod members${counts.members ? ` ${counts.members}` : ""}`}
            active={layers.pod}
            onClick={() => onToggle("pod")}
            swatch={<span className="size-4 rounded-[5px] bg-brand-700" />}
          />
        </div>
      </div>
    </div>
  );
}

function Pin() {
  return (
    <svg width="14" height="18" viewBox="0 0 24 32" aria-hidden="true">
      <path
        d="M12 1C6.2 1 1.5 5.7 1.5 11.5C1.5 19.6 12 30.5 12 30.5S22.5 19.6 22.5 11.5C22.5 5.7 17.8 1 12 1Z"
        fill={MAP_COLORS.event}
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LegendChipProps {
  label: string;
  swatch: ReactNode;
  active: boolean;
  onClick: () => void;
}

function LegendChip({ label, swatch, active, onClick }: LegendChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3 text-base font-semibold transition-colors",
        active
          ? "border-brand-200 bg-brand-50 text-brand-800"
          : "border-line bg-canvas text-ink-faint line-through decoration-2",
      ].join(" ")}
    >
      <span className={active ? "" : "opacity-40"}>{swatch}</span>
      {label}
    </button>
  );
}
