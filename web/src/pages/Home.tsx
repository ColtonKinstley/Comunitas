/**
 * The daily anchor: who you are, what's next, who you're doing it with, and
 * proof you've been keeping it up.
 */
import { CalendarDays, ChevronRight, Sparkles, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Button, LinkButton } from "../components/Button";
import { Card, LinkCard } from "../components/Card";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { firstNameOf, friendlyWhen, timeOfDayGreeting } from "../features/home/datetime";
import { NextEventCard } from "../features/home/NextEventCard";
import { PodSnapshotCard } from "../features/home/PodSnapshotCard";
import { useHome } from "../features/home/useHome";
import { useCurrentPatient } from "../lib/patient";

export default function Home() {
  const patientId = useCurrentPatient();
  const { data, loading, error, reload, applyRsvp } = useHome(patientId);

  const greeting = timeOfDayGreeting();
  const name = data ? firstNameOf(data.patient.name) : "";
  const next = data?.upcoming[0];
  const following = data?.upcoming[1];

  return (
    <div className="pb-8">
      <PageHeader
        title={data ? `${greeting}, ${name}` : greeting}
        subtitle={
          data ? (
            <>
              Here's what's coming up
              {data.history.currentStreak > 0 && (
                <span className="mt-2 block">
                  <Chip tone="accent">🔥 {data.history.currentStreak}-week streak</Chip>
                </span>
              )}
            </>
          ) : (
            "Getting your week together…"
          )
        }
      />

      <div className="space-y-5 px-5 pt-5">
        {loading && <HomeSkeleton />}

        {!loading && error && (
          <EmptyState
            icon={<TriangleAlert size={28} />}
            title="We couldn't load your week"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {!loading && !error && data && (
          <>
            {next && patientId ? (
              <NextEventCard event={next} patientId={patientId} onRsvp={applyRsvp} />
            ) : (
              <EmptyState
                icon={<CalendarDays size={28} />}
                title="Nothing in the diary yet"
                message="Your pod hasn't planned its next get-together. We'll let you know the moment it's set."
                action={<LinkButton to="/events">Browse activities</LinkButton>}
              />
            )}

            {following && (
              <LinkCard to="/events">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-wide text-ink-faint uppercase">
                      After that
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink">{following.title}</p>
                    <p className="mt-0.5 text-base text-ink-soft">
                      {friendlyWhen(following.startsAt)}
                    </p>
                  </div>
                  <ChevronRight size={24} className="shrink-0 text-brand-600" aria-hidden />
                </div>
              </LinkCard>
            )}

            {data.patient.pod ? (
              <PodSnapshotCard
                pod={data.patient.pod}
                detail={data.pod}
                currentPatientId={data.patient.id}
              />
            ) : (
              <EmptyState
                icon={<Sparkles size={28} />}
                title="We're finding your pod"
                message="We're looking for a small group near you with things in common. It usually takes a day or two."
              />
            )}

            <StreakCard
              currentStreak={data.history.currentStreak}
              attendedCount={data.history.attendedCount}
              totalCount={data.history.totalCount}
            />
          </>
        )}
      </div>
    </div>
  );
}

function StreakCard({
  currentStreak,
  attendedCount,
  totalCount,
}: {
  currentStreak: number;
  attendedCount: number;
  totalCount: number;
}) {
  return (
    <Card>
      {totalCount === 0 ? (
        <p className="text-base text-ink-soft">
          Once you've been to your first activity, your record will start building here.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base text-ink-soft">
              {currentStreak > 0 ? (
                <>
                  You've turned up{" "}
                  <strong className="text-ink">
                    {currentStreak} {currentStreak === 1 ? "week" : "weeks"}
                  </strong>{" "}
                  in a row.
                </>
              ) : (
                <>A fresh week — a good one to start again.</>
              )}
            </p>
            <p className="mt-1 text-base text-ink-faint">
              {attendedCount} of {totalCount} activities so far
            </p>
          </div>
          <span className="text-4xl" aria-hidden>
            🔥
          </span>
        </div>
      )}
      <Link
        to="/history"
        className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-brand-700 underline underline-offset-4"
      >
        See your full history
        <ChevronRight size={20} aria-hidden />
      </Link>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading your week">
      <div className="h-64 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-32 animate-pulse rounded-2xl bg-line/50" />
      <div className="h-28 animate-pulse rounded-2xl bg-line/40" />
    </div>
  );
}
