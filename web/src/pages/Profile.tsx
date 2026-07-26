/**
 * The structured profile — everything the matcher uses, grouped into five
 * sections that each edit in place.
 */
import { LogOut, Mic, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router";
import { Button, LinkButton } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { AboutSection } from "../features/profile/AboutSection";
import { AvailabilitySection } from "../features/profile/AvailabilitySection";
import { HealthSection } from "../features/profile/HealthSection";
import { InterestsSection } from "../features/profile/InterestsSection";
import { LocationSection } from "../features/profile/LocationSection";
import { useProfileData } from "../features/profile/useProfileData";
import { authClient } from "../lib/auth";
import { clearCurrentPatient, useCurrentPatient } from "../lib/patient";

export default function Profile() {
  const navigate = useNavigate();
  const patientId = useCurrentPatient();
  const { patient, loading, error, reload, setPatient } = useProfileData(patientId);
  const { data: session } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    clearCurrentPatient();
    navigate("/", { replace: true });
  }

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

            {/* The shared demo persona can't redo — the API rejects it too. */}
            {patient.name !== "Priya Shah" && (
              <Card>
                <h2 className="flex items-center gap-2 text-lg text-ink">
                  <span className="text-brand-600" aria-hidden>
                    <Mic size={22} />
                  </span>
                  Induction
                </h2>
                <p className="mt-1 text-sm text-ink-faint">
                  {patient.inductionStatus === "complete"
                    ? "Things changed? Have the chat again to refresh your profile — your pod match may change too."
                    : "A five-minute chat that fills in your profile and matches you with a pod."}
                </p>
                <LinkButton
                  to="/induction?resume=1"
                  variant="secondary"
                  fullWidth
                  className="mt-4"
                >
                  <Mic size={18} aria-hidden />
                  {patient.inductionStatus === "complete"
                    ? "Redo your induction"
                    : "Finish your induction"}
                </LinkButton>
              </Card>
            )}
          </>
        )}

        {session && (
          <Card>
            <h2 className="flex items-center gap-2 text-lg text-ink">
              <span className="text-brand-600" aria-hidden>
                <LogOut size={22} />
              </span>
              Account
            </h2>
            <p className="mt-1 text-sm text-ink-faint">Signed in as {session.user.email}</p>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => void signOut()}
              className="mt-4"
            >
              <LogOut size={18} aria-hidden />
              Sign out
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
