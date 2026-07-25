/**
 * Pod identity: who these people are, why you were put together, and where it
 * happens. No health information about anyone but you appears on this screen.
 */
import { Sparkles, TriangleAlert, Users } from "lucide-react";
import { Button, LinkButton } from "../components/Button";
import { Card, CardSectionTitle } from "../components/Card";
import { Chip, humanizeSlug } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { MeetingAreaCard } from "../features/pod/MeetingAreaCard";
import { MemberList } from "../features/pod/MemberList";
import { usePod } from "../features/pod/usePod";
import { useCurrentPatient } from "../lib/patient";

export default function Pod() {
  const patientId = useCurrentPatient();
  const { data, loading, error, reload } = usePod(patientId);
  const pod = data?.pod;

  return (
    <div className="pb-8">
      <PageHeader title="Your pod" subtitle="The people you'll be moving with" back />

      <div className="space-y-5 px-5 pt-5">
        {loading && (
          <div className="space-y-5" aria-busy="true" aria-label="Loading your pod">
            <div className="h-44 animate-pulse rounded-2xl bg-line/60" />
            <div className="h-72 animate-pulse rounded-2xl bg-line/40" />
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon={<TriangleAlert size={28} />}
            title="We couldn't load your pod"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {!loading && !error && data && !pod && (
          <EmptyState
            icon={<Sparkles size={28} />}
            title="We're forming your pod"
            message="We're looking for a handful of people near you who want the same sorts of things. It usually takes a day or two — we'll let you know as soon as it's ready."
            action={<LinkButton to="/profile">Check your details</LinkButton>}
          />
        )}

        {!loading && !error && data && pod && (
          <>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl text-ink">{pod.name}</h2>
                <Chip tone={pod.status === "active" ? "success" : "accent"}>
                  {pod.status === "active" ? "Active" : "Forming"}
                </Chip>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-base text-ink-soft">
                <Users size={18} className="shrink-0 text-ink-faint" aria-hidden />
                {pod.memberCount} {pod.memberCount === 1 ? "member" : "members"}
              </p>
              {pod.description && (
                <p className="mt-3 text-base text-ink-soft">{pod.description}</p>
              )}
            </Card>

            {pod.sharedInterests.length > 0 && (
              <Card>
                <h2 className="text-lg text-ink">What the group enjoys</h2>
                <p className="mt-1 text-base text-ink-soft">
                  You all live close to one another. These are the things people in this pod are
                  into:
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {pod.sharedInterests.map((interest) => (
                    <li key={interest}>
                      <Chip tone="brand">{humanizeSlug(interest)}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <MeetingAreaCard pod={pod} map={data.map} />

            <section>
              <CardSectionTitle>
                Members ({pod.memberCount})
              </CardSectionTitle>
              <MemberList
                members={pod.members}
                currentPatientId={data.patient.id}
                sharedInterests={pod.sharedInterests}
              />
              <p className="mt-3 px-1 text-sm text-ink-faint">
                We only ever show first names and interests. Nobody in your pod can see your
                health information.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
