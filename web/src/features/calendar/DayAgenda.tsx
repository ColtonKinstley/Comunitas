/** What's on for the day tapped in the grid. */
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Link } from "react-router";
import { Chip } from "../../components/Chip";
import { EmptyState } from "../../components/EmptyState";
import type { EventWithRsvp } from "../../lib/types";
import { activityIcon } from "../events/activity";
import { formatTime } from "../events/format";
import { statusMeta } from "../events/status";

interface DayAgendaProps {
  events: EventWithRsvp[];
  /** True when there is something else to find in this month. */
  monthHasEvents: boolean;
}

export function DayAgenda({ events, monthHasEvents }: DayAgendaProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="Nothing this day"
        message={
          monthHasEvents
            ? "Tap a dot on the calendar to see what's on that day."
            : "No activities this month. Try the months either side."
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const Icon = activityIcon(event.activityType);
        const status = statusMeta(event.status);
        return (
          <li key={event.id}>
            <Link
              to={`/events/${event.id}`}
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="w-[68px] shrink-0 pt-0.5 text-base font-bold text-brand-700">
                {formatTime(event.startsAt)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <Icon size={18} className="mt-1.5 shrink-0 text-ink-faint" aria-hidden />
                  <span className="text-lg font-bold text-ink">{event.title}</span>
                </span>

                {event.venueName && (
                  <span className="mt-1 flex items-start gap-1.5 text-base text-ink-soft">
                    <MapPin size={16} className="mt-1 shrink-0" aria-hidden />
                    <span>{event.venueName}</span>
                  </span>
                )}

                <span className="mt-2 flex">
                  <Chip tone={status.tone}>{status.label}</Chip>
                </span>
              </span>

              <ChevronRight size={20} className="mt-1 shrink-0 text-ink-faint" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
