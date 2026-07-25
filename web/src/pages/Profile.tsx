import { CircleUserRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/**
 * Placeholder. Will show the structured profile grouped into about, location &
 * travel, health & goals, interests and availability — each tap-to-edit.
 */
export default function Profile() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Your profile" subtitle="Everything we use to match you" />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<CircleUserRound size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "Your details, health goals, interests and availability will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
