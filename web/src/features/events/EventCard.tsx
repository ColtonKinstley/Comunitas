/**
 * One upcoming activity in the feed: what it is, when and where, and the RSVP
 * right there — replying should never need a second screen.
 */
import { ChevronRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Card } from "../../components/Card";
import { Chip } from "../../components/Chip";
import type { EventWithRsvp } from "../../lib/types";
import { activityIcon, activityLabel } from "./activity";
import { formatWhen } from "./format";
import { RsvpButtons, rsvpSummary } from "./RsvpButtons";
import { AGENT_SUGGESTION_LINE, statusMeta } from "./status";
import { useRsvpState } from "./useRsvpState";

interface EventCardProps {
  event: EventWithRsvp;
  patientId: string | null;
}

export function EventCard({ event, patientId }: EventCardProps) {
  const Icon = activityIcon(event.activityType);
  const status = statusMeta(event.status);
  const { myRsvp, counts, pending, error, choose } = useRsvpState(
    event.id,
    patientId,
    event.myRsvp,
    event.rsvpCounts,
  );

  return (
    <Card flush className="overflow-hidden">
      <Link
        to={`/events/${event.id}`}
        className="block px-5 pt-5 pb-4 transition-colors hover:bg-brand-50/50"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"
            aria-hidden
          >
            <Icon size={22} strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-ink">{event.title}</h3>
              <ChevronRight size={20} className="mt-1 shrink-0 text-ink-faint" aria-hidden />
            </div>

            <p className="mt-0.5 text-base font-semibold text-brand-700">
              {formatWhen(event.startsAt)}
            </p>

            {event.venueName && (
              <p className="mt-1 flex items-start gap-1.5 text-base text-ink-soft">
                <MapPin size={17} className="mt-1 shrink-0" aria-hidden />
                <span>{event.venueName}</span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip tone={status.tone}>{status.label}</Chip>
              <Chip tone="neutral">{activityLabel(event.activityType)}</Chip>
            </div>
          </div>
        </div>
      </Link>

      {event.status === "proposed" && (
        <p className="flex items-start gap-2 border-t border-line/70 bg-accent-50/70 px-5 py-3 text-sm text-accent-700">
          <Sparkles size={17} className="mt-0.5 shrink-0" aria-hidden />
          <span>{AGENT_SUGGESTION_LINE}</span>
        </p>
      )}

      <div className="border-t border-line/70 px-5 pt-4 pb-5">
        <RsvpButtons
          value={myRsvp}
          pending={pending}
          onChoose={choose}
          eventTitle={event.title}
          disabled={!patientId}
        />
        <p className="mt-3 text-sm font-medium text-ink-faint" aria-live="polite">
          {rsvpSummary(counts)}
        </p>
        {error && <p className="mt-1 text-sm font-semibold text-danger-700">{error}</p>}
      </div>
    </Card>
  );
}
