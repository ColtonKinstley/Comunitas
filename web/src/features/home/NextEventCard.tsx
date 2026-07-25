/** The one card that matters on home: what's next, and are you coming? */
import { ChevronRight, Clock, MapPin, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Card } from "../../components/Card";
import { Chip, humanizeSlug } from "../../components/Chip";
import { rsvp } from "../../lib/api";
import type { EventWithRsvp, RsvpStatus } from "../../lib/types";
import { friendlyWhen, timeRange } from "./datetime";

const RSVP_OPTIONS: { status: RsvpStatus; label: string; aria: string }[] = [
  { status: "yes", label: "Going", aria: "Yes, I'm going" },
  { status: "maybe", label: "Maybe", aria: "Maybe, I'm not sure yet" },
  { status: "no", label: "Can't go", aria: "No, I can't make it" },
];

const SELECTED: Record<RsvpStatus, string> = {
  yes: "bg-brand-600 text-white border-brand-600",
  maybe: "bg-accent-100 text-accent-700 border-accent-500",
  no: "bg-danger-100 text-danger-700 border-danger-500",
};

function StatusChip({ status }: { status: EventWithRsvp["status"] }) {
  if (status === "confirmed") return <Chip tone="success">Confirmed</Chip>;
  if (status === "proposed") return <Chip tone="accent">Being planned</Chip>;
  if (status === "cancelled") return <Chip tone="danger">Cancelled</Chip>;
  return <Chip tone="muted">Finished</Chip>;
}

interface NextEventCardProps {
  event: EventWithRsvp;
  patientId: string;
  onRsvp: (eventId: string, status: RsvpStatus, counts: EventWithRsvp["rsvpCounts"]) => void;
}

export function NextEventCard({ event, patientId, onRsvp }: NextEventCardProps) {
  const [saving, setSaving] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(status: RsvpStatus) {
    setSaving(status);
    setError(null);
    try {
      const result = await rsvp(event.id, { patientId, status });
      onRsvp(event.id, result.status, result.rsvpCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save that. Try again?");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card flush className="overflow-hidden">
      {/* The whole top of the card is one tap target through to the activity. */}
      <Link
        to={`/events/${event.id}`}
        aria-label={`${event.title} — see this activity`}
        className="block px-5 pt-5 pb-4 transition-colors hover:bg-brand-50/50"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Next up</p>
          <StatusChip status={event.status} />
        </div>

        <div className="flex items-start justify-between gap-2">
          <h2 className="text-2xl text-ink">{event.title}</h2>
          <ChevronRight size={22} className="mt-1.5 shrink-0 text-brand-600" aria-hidden />
        </div>

        <p className="mt-1 text-lg font-semibold text-brand-700">{friendlyWhen(event.startsAt)}</p>

        <dl className="mt-3 space-y-1.5 text-base text-ink-soft">
          {event.venueName && (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Where</dt>
              <MapPin size={20} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
              <dd>{event.venueName}</dd>
            </div>
          )}
          <div className="flex items-start gap-2">
            <dt className="sr-only">When</dt>
            <Clock size={20} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
            <dd>{timeRange(event.startsAt, event.endsAt)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="brand">{humanizeSlug(event.activityType)}</Chip>
          <Chip tone="muted">{event.rsvpCounts.yes} going</Chip>
        </div>
      </Link>

      <div className="border-t border-line px-5 pt-4 pb-5">
        <p className="mb-2 text-base font-semibold text-ink">Can you come?</p>
        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map(({ status, label, aria }) => {
            const selected = event.myRsvp === status;
            return (
              <button
                key={status}
                type="button"
                aria-label={aria}
                aria-pressed={selected}
                disabled={saving !== null}
                onClick={() => void choose(status)}
                className={[
                  "min-h-[48px] rounded-2xl border-2 px-1 text-base font-semibold transition-colors",
                  "disabled:opacity-60",
                  selected
                    ? SELECTED[status]
                    : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:bg-brand-50",
                ].join(" ")}
              >
                {saving === status ? "…" : label}
              </button>
            );
          })}
        </div>
        {event.myRsvp && !saving && (
          <p className="mt-2 text-sm text-ink-faint">
            {event.myRsvp === "yes"
              ? "Lovely — we'll see you there."
              : event.myRsvp === "maybe"
                ? "No problem, you can change this any time."
                : "That's fine — there's always the next one."}
          </p>
        )}
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-danger-700">
            <TriangleAlert size={16} aria-hidden />
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
