/**
 * Seven days down, three parts of the day across. Filled cells are the times
 * the patient can make — the single most important input to event planning.
 */
import { Check } from "lucide-react";
import { DAY_KEYS, TIME_SLOTS } from "../../lib/types";
import type { Availability, DayKey, TimeSlot } from "../../lib/types";
import { DAY_FULL_LABELS, DAY_LABELS, SLOT_LABELS } from "./vocab";

export function isFree(availability: Availability, day: DayKey, slot: TimeSlot): boolean {
  return (availability[day] ?? []).includes(slot);
}

/** Immutably flips one cell, dropping days that end up empty. */
export function toggleSlot(
  availability: Availability,
  day: DayKey,
  slot: TimeSlot,
): Availability {
  const current = availability[day] ?? [];
  const next = current.includes(slot)
    ? current.filter((s) => s !== slot)
    : [...TIME_SLOTS].filter((s) => current.includes(s) || s === slot);
  const updated: Availability = { ...availability };
  if (next.length === 0) delete updated[day];
  else updated[day] = next;
  return updated;
}

export function countSlots(availability: Availability): number {
  return DAY_KEYS.reduce((total, day) => total + (availability[day] ?? []).length, 0);
}

interface AvailabilityGridProps {
  availability: Availability;
  editing?: boolean;
  onToggle?: (day: DayKey, slot: TimeSlot) => void;
}

export function AvailabilityGrid({
  availability,
  editing = false,
  onToggle,
}: AvailabilityGridProps) {
  return (
    <div className="grid grid-cols-[2.75rem_repeat(3,1fr)] gap-1.5">
      <span aria-hidden />
      {TIME_SLOTS.map((slot) => (
        <span
          key={slot}
          className="pb-1 text-center text-sm font-semibold text-ink-faint"
          aria-hidden
        >
          {SLOT_LABELS[slot]}
        </span>
      ))}

      {DAY_KEYS.map((day) => (
        <Row
          key={day}
          day={day}
          availability={availability}
          editing={editing}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function Row({
  day,
  availability,
  editing,
  onToggle,
}: {
  day: DayKey;
  availability: Availability;
  editing: boolean;
  onToggle?: (day: DayKey, slot: TimeSlot) => void;
}) {
  return (
    <>
      <span className="flex items-center text-base font-semibold text-ink-soft">
        {DAY_LABELS[day]}
      </span>
      {TIME_SLOTS.map((slot) => {
        const free = isFree(availability, day, slot);
        const label = `${DAY_FULL_LABELS[day]} ${SLOT_LABELS[slot].toLowerCase()}`;
        const shared = "flex min-h-[44px] items-center justify-center rounded-xl border-2";
        const tone = free
          ? "border-brand-500 bg-brand-100 text-brand-700"
          : "border-dashed border-line bg-canvas text-ink-faint";

        if (!editing) {
          return (
            <span
              key={slot}
              className={[shared, tone].join(" ")}
              role="img"
              aria-label={`${label}: ${free ? "available" : "not available"}`}
            >
              {free ? <Check size={20} strokeWidth={3} aria-hidden /> : null}
            </span>
          );
        }

        return (
          <button
            key={slot}
            type="button"
            aria-pressed={free}
            aria-label={label}
            onClick={() => onToggle?.(day, slot)}
            className={[
              shared,
              "transition-colors",
              free
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-dashed border-line bg-surface text-ink-faint hover:border-brand-300 hover:bg-brand-50",
            ].join(" ")}
          >
            {free ? <Check size={20} strokeWidth={3} aria-hidden /> : null}
          </button>
        );
      })}
    </>
  );
}
