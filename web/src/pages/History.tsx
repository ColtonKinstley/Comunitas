/** The adherence story: streak header on top, everything you've been to below. */
import { Footprints, TriangleAlert } from "lucide-react";
import { Button, LinkButton } from "../components/Button";
import { CardSectionTitle } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StreakHeader } from "../features/history/StreakHeader";
import { Timeline } from "../features/history/Timeline";
import { useHistory } from "../features/history/useHistory";
import { useCurrentPatient } from "../lib/patient";

export default function History() {
  const patientId = useCurrentPatient();
  const { data, loading, error, reload } = useHistory(patientId);

  return (
    <div className="pb-8">
      <PageHeader title="Your history" subtitle="Everything you've turned up to" back />

      <div className="space-y-6 px-5 pt-5">
        {loading && (
          <div className="space-y-5" aria-busy="true" aria-label="Loading your history">
            <div className="h-48 animate-pulse rounded-2xl bg-line/60" />
            <div className="h-64 animate-pulse rounded-2xl bg-line/40" />
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon={<TriangleAlert size={28} />}
            title="We couldn't load your history"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {!loading && !error && data && (
          <>
            <StreakHeader history={data} />

            {data.events.length === 0 ? (
              <EmptyState
                icon={<Footprints size={28} />}
                title="Your story starts here"
                message="You haven't been to an activity yet. Once you have, every one will be kept here for you."
                action={<LinkButton to="/events">See what's coming up</LinkButton>}
              />
            ) : (
              <section>
                <CardSectionTitle>
                  {data.events.length} {data.events.length === 1 ? "activity" : "activities"}
                </CardSectionTitle>
                <Timeline entries={data.events} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
