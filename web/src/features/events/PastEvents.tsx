/**
 * Past activities, collapsed by default — the point of the screen is what's
 * next, but the record of what you turned up to is quietly motivating.
 */
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Card } from "../../components/Card";
import type { EventWithRsvp } from "../../lib/types";
import { activityIcon } from "./activity";
import { formatWhen } from "./format";

interface PastEventsProps {
  events: EventWithRsvp[];
}

export function PastEvents({ events }: PastEventsProps) {
  const [open, setOpen] = useState(false);
  const attended = events.filter((event) => event.attended).length;

  return (
    <Card flush className="overflow-hidden bg-surface/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-canvas"
      >
        <span>
          <span className="block text-lg font-bold text-ink-soft">Past activities</span>
          <span className="block text-sm text-ink-faint">
            {events.length} in total · you came to {attended}
          </span>
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul className="border-t border-line/70">
          {events.map((event) => {
            const Icon = activityIcon(event.activityType);
            return (
              <li key={event.id} className="border-b border-line/60 last:border-b-0">
                <Link
                  to={`/events/${event.id}`}
                  className="flex min-h-[64px] items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-ink-faint"
                    aria-hidden
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-ink-soft">
                      {event.title}
                    </span>
                    <span className="block text-sm text-ink-faint">
                      {formatWhen(event.startsAt)}
                    </span>
                  </span>
                  {event.attended !== null && <AttendedMark attended={event.attended} />}
                  <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AttendedMark({ attended }: { attended: boolean }) {
  const label = attended ? "You went" : "You missed this one";
  return (
    <span
      title={label}
      className={[
        "grid size-7 shrink-0 place-items-center rounded-full",
        attended ? "bg-brand-100 text-brand-700" : "bg-canvas text-ink-faint",
      ].join(" ")}
    >
      <span className="sr-only">{label}</span>
      {attended ? <Check size={16} strokeWidth={3} aria-hidden /> : <X size={16} aria-hidden />}
    </span>
  );
}
