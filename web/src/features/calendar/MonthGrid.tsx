/**
 * The month view. Days with something on get a coloured dot per event; today
 * is ringed; the selected day is filled.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth } from "date-fns";
import type { EventWithRsvp } from "../../lib/types";
import { formatMonthTitle } from "../events/format";
import { statusMeta } from "../events/status";
import { dayKey, monthWeeks, WEEKDAY_LABELS } from "./month";

interface MonthGridProps {
  month: Date;
  selected: Date;
  eventsByDay: Map<string, EventWithRsvp[]>;
  onSelect: (day: Date) => void;
  onMonthChange: (month: Date) => void;
}

const MAX_DOTS = 3;

export function MonthGrid({
  month,
  selected,
  eventsByDay,
  onSelect,
  onMonthChange,
}: MonthGridProps) {
  const weeks = monthWeeks(month);
  const previous = startOfMonth(addMonths(month, -1));
  const next = startOfMonth(addMonths(month, 1));

  return (
    <section className="rounded-3xl border border-line bg-surface p-3 shadow-card">
      <header className="mb-1 flex items-center justify-between gap-2">
        <ArrowButton
          direction="previous"
          label={`Previous month, ${formatMonthTitle(previous)}`}
          onClick={() => onMonthChange(previous)}
        />
        <h2 aria-live="polite" className="text-xl font-bold text-ink">
          {formatMonthTitle(month)}
        </h2>
        <ArrowButton
          direction="next"
          label={`Next month, ${formatMonthTitle(next)}`}
          onClick={() => onMonthChange(next)}
        />
      </header>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            aria-hidden
            className="pb-1 text-center text-xs font-bold tracking-wide text-ink-faint uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {weeks.flat().map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            month={month}
            selected={isSameDay(day, selected)}
            events={eventsByDay.get(dayKey(day)) ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

interface DayCellProps {
  day: Date;
  month: Date;
  selected: boolean;
  events: EventWithRsvp[];
  onSelect: (day: Date) => void;
}

function DayCell({ day, month, selected, events, onSelect }: DayCellProps) {
  const outside = !isSameMonth(day, month);
  const today = isToday(day);

  const label = [
    format(day, "EEEE d MMMM yyyy"),
    today ? "today" : null,
    events.length === 1 ? "1 activity" : events.length > 1 ? `${events.length} activities` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={label}
      aria-pressed={selected}
      {...(today ? { "aria-current": "date" as const } : {})}
      className={[
        "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl",
        "text-base font-semibold transition-colors",
        selected
          ? "bg-brand-600 text-white"
          : today
            ? "text-brand-800 ring-2 ring-brand-500 ring-inset hover:bg-brand-50"
            : outside
              ? "text-ink-faint/60 hover:bg-canvas"
              : "text-ink hover:bg-brand-50",
      ].join(" ")}
    >
      <span className={selected ? "font-bold" : undefined}>{format(day, "d")}</span>
      <span className="flex h-1.5 items-center gap-[3px]">
        {events.slice(0, MAX_DOTS).map((event) => (
          <span
            key={event.id}
            className={[
              "size-1.5 rounded-full",
              selected ? "bg-white" : statusMeta(event.status).dot,
            ].join(" ")}
          />
        ))}
      </span>
    </button>
  );
}

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-brand-700 transition-colors hover:bg-brand-50"
    >
      <Icon size={24} strokeWidth={2.4} aria-hidden />
    </button>
  );
}
