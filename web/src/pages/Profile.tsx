/**
 * The structured profile — everything the matcher uses, grouped into five
 * sections that each edit in place.
 */
import { TriangleAlert } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { AboutSection } from "../features/profile/AboutSection";
import { AvailabilitySection } from "../features/profile/AvailabilitySection";
import { HealthSection } from "../features/profile/HealthSection";
import { InterestsSection } from "../features/profile/InterestsSection";
import { LocationSection } from "../features/profile/LocationSection";
import { useProfileData } from "../features/profile/useProfileData";
import { useCurrentPatient } from "../lib/patient";

export default function Profile() {
  const patientId = useCurrentPatient();
  const { patient, loading, error, reload, setPatient } = useProfileData(patientId);

  return (
    <div className="pb-8">
      <PageHeader title="Your profile" subtitle="Everything we use to match you" />

      <div className="space-y-4 px-5 pt-5">
        {loading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading your profile">
            <div className="h-36 animate-pulse rounded-2xl bg-line/60" />
            <div className="h-52 animate-pulse rounded-2xl bg-line/50" />
            <div className="h-60 animate-pulse rounded-2xl bg-line/40" />
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon={<TriangleAlert size={28} />}
            title="We couldn't load your profile"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {!loading && !error && patient && (
          <>
            <p className="px-1 text-base text-ink-soft">
              Tap <strong className="text-ink">Edit</strong> on any part to change it. Nothing is
              shared with your pod except your first name and what you enjoy.
            </p>
            <AboutSection patient={patient} onSaved={setPatient} />
            <LocationSection patient={patient} onSaved={setPatient} />
            <HealthSection patient={patient} onSaved={setPatient} />
            <InterestsSection patient={patient} onSaved={setPatient} />
            <AvailabilitySection patient={patient} onSaved={setPatient} />
          </>
        )}
      </div>
    </div>
  );
}
