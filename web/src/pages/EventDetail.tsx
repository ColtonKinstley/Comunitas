/**
 * One activity in full: what it is, when and where, who's coming, and the
 * three buttons that matter.
 */
import { CalendarDays, ChevronRight, Clock, MapPin, Sparkles, Users } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { activityIcon, activityLabel } from "../features/events/activity";
import { formatDayLong, formatTimeRange, toDate } from "../features/events/format";
import { RsvpButtons, rsvpSummary } from "../features/events/RsvpButtons";
import { AGENT_SUGGESTION_LINE, statusMeta } from "../features/events/status";
import { ErrorCard, LoadingNote } from "../features/events/states";
import { useAsync } from "../features/events/useAsync";
import { useRsvpState } from "../features/events/useRsvpState";
import { getEvent, getPatient } from "../lib/api";
import { useCurrentPatient } from "../lib/patient";
import type { EventDetail as EventDetailPayload } from "../lib/types";

export default function EventDetail() {
  const { id } = useParams();
  const patientId = useCurrentPatient();

  const { data, error, loading, reload } = useAsync(id ? `${id}:${patientId ?? ""}` : null, () =>
    getEvent(id ?? "", patientId ?? undefined),
  );

  // Only used to recognise "you" in the who's-going list.
  const me = useAsync(patientId, () => getPatient(patientId ?? ""));
  const myFirstName = me.data?.name?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="pb-10">
      <PageHeader title="Activity" subtitle="What, where and who" back />

      <div className="px-5 pt-5">
        {loading && <LoadingNote label="Loading this activity…" />}

        {error && !loading && <ErrorCard message={error} onRetry={reload} />}

        {!loading && !error && !data && (
          <EmptyState
            icon={<CalendarDays size={28} />}
            title="We couldn't find that activity"
            message="It may have been removed. Try the activities list."
          />
        )}

        {!loading && !error && data && (
          <EventBody event={data} patientId={patientId} myFirstName={myFirstName} />
        )}
      </div>
    </div>
  );
}

interface EventBodyProps {
  event: EventDetailPayload;
  patientId: string | null;
  myFirstName: string | null;
}

function EventBody({ event, patientId, myFirstName }: EventBodyProps) {
  const Icon = activityIcon(event.activityType);
  const status = statusMeta(event.status);
  const isOver = event.status === "completed" || event.status === "cancelled";

  const { myRsvp, counts, pending, error, choose } = useRsvpState(
    event.id,
    patientId,
    event.myRsvp,
    event.rsvpCounts,
  );

  // The server list is a snapshot from load time; fold in whatever the RSVP
  // buttons have done since so the list agrees with the highlighted button.
  const going = useMemo(() => {
    const mine = myFirstName ?? "You";
    const others = event.going.filter((name) => name !== mine);
    return myRsvp === "yes" ? [mine, ...others] : others;
  }, [event.going, myFirstName, myRsvp]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"
            aria-hidden
          >
            <Icon size={26} strokeWidth={2} />
          </span>
          <h2 className="text-2xl font-bold text-ink">{event.title}</h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={status.tone}>{status.label}</Chip>
          <Chip tone="neutral">{activityLabel(event.activityType)}</Chip>
          {event.podName && <Chip tone="brand">{event.podName}</Chip>}
        </div>

        {event.status === "proposed" && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-accent-50 px-4 py-3 text-base text-accent-700">
            <Sparkles size={19} className="mt-0.5 shrink-0" aria-hidden />
            <span>{AGENT_SUGGESTION_LINE}</span>
          </p>
        )}
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <CalendarDays size={22} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
          <div>
            <p className="text-lg font-bold text-ink">{formatDayLong(toDate(event.startsAt))}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-base text-ink-soft">
              <Clock size={17} aria-hidden />
              {formatTimeRange(event.startsAt, event.endsAt)}
            </p>
          </div>
        </div>

        {event.description && (
          <p className="mt-4 border-t border-line/70 pt-4 text-base text-ink-soft">
            {event.description}
          </p>
        )}
      </Card>

      {event.venueName && (
        <Card flush className="overflow-hidden">
          <div className="flex items-start gap-3 px-5 pt-5 pb-4">
            <MapPin size={22} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold tracking-wide text-ink-faint uppercase">Where</p>
              <p className="text-lg font-bold text-ink">{event.venueName}</p>
            </div>
          </div>
          <Link
            to="/map"
            className="flex min-h-[52px] items-center justify-between border-t border-line/70 px-5 py-3 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Open in map
            <ChevronRight size={20} aria-hidden />
          </Link>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-bold text-ink">{isOver ? "How it went" : "Are you coming?"}</h3>

        {isOver ? (
          <p className="mt-2 text-base text-ink-soft">
            {event.attended === true
              ? "You came to this one. Nice work."
              : event.attended === false
                ? "You missed this one — there are plenty more coming up."
                : "This activity has already happened."}
          </p>
        ) : (
          <>
            <div className="mt-3">
              <RsvpButtons
                value={myRsvp}
                pending={pending}
                onChoose={choose}
                eventTitle={event.title}
                disabled={!patientId}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-ink-faint" aria-live="polite">
              {rsvpSummary(counts)}
            </p>
            {error && <p className="mt-1 text-sm font-semibold text-danger-700">{error}</p>}
          </>
        )}
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Users size={20} className="text-brand-600" aria-hidden />
          {isOver ? "Who said yes" : "Who's going"}
        </h3>
        {going.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {going.map((name) => {
              const isMe = myFirstName !== null ? name === myFirstName : name === "You";
              return (
                <li
                  key={name}
                  className={[
                    "flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-base font-semibold",
                    isMe
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-line bg-canvas text-ink-soft",
                  ].join(" ")}
                >
                  <span
                    className="grid size-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
                    aria-hidden
                  >
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  {isMe ? `${name} (you)` : name}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-base text-ink-soft">
            {isOver
              ? "Nobody replied to this one."
              : "Nobody has said yes yet — you could be the first."}
          </p>
        )}
      </Card>
    </div>
  );
}
