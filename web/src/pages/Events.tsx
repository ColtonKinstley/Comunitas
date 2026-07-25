/**
 * The pod's activity feed: what's coming up (with the RSVP right on the card),
 * and everything that already happened tucked away behind a tap.
 */
import { CalendarCheck, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { LinkButton } from "../components/Button";
import { CardSectionTitle } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { EventCard } from "../features/events/EventCard";
import { PastEvents } from "../features/events/PastEvents";
import { ErrorCard, SkeletonList } from "../features/events/states";
import { useAsync } from "../features/events/useAsync";
import { getPatientEvents } from "../lib/api";
import { useCurrentPatient } from "../lib/patient";
import type { EventWithRsvp } from "../lib/types";

/** Anything still open counts as "coming up"; done and cancelled fall to the past. */
const isUpcoming = (event: EventWithRsvp) =>
  event.status === "proposed" || event.status === "confirmed";

export default function Events() {
  const patientId = useCurrentPatient();

  const { data, error, loading, reload } = useAsync(patientId, () =>
    getPatientEvents(patientId ?? ""),
  );

  const { upcoming, past } = useMemo(() => {
    const events = data ?? [];
    return {
      // Soonest first for what's ahead; most recent first for what's behind.
      upcoming: events
        .filter(isUpcoming)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      past: events
        .filter((event) => !isUpcoming(event))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    };
  }, [data]);

  return (
    <div className="pb-10">
      <PageHeader title="Activities" subtitle="Say yes to what suits you" />

      <div className="space-y-7 px-5 pt-5">
        {loading && <SkeletonList count={2} />}

        {error && !loading && <ErrorCard message={error} onRetry={reload} />}

        {!loading && !error && (
          <>
            <section>
              <CardSectionTitle>Coming up</CardSectionTitle>
              {upcoming.length > 0 ? (
                <div className="space-y-4">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} patientId={patientId} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarCheck size={28} />}
                  title="Nothing planned yet"
                  message="Your pod hasn't got anything in the diary. We'll suggest something soon."
                  action={
                    <LinkButton to="/calendar" variant="secondary">
                      <CalendarDays size={20} aria-hidden />
                      See the calendar
                    </LinkButton>
                  }
                />
              )}
            </section>

            <section>
              <CardSectionTitle>Already been</CardSectionTitle>
              {past.length > 0 ? (
                <PastEvents events={past} />
              ) : (
                <EmptyState
                  title="No past activities yet"
                  message="Once you've been to your first one, it'll show up here."
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
