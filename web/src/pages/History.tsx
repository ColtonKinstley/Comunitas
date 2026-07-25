import { Flame } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show the streak header and a timeline of past activities. */
export default function History() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Your history" subtitle="Everything you've turned up to" back />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<Flame size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "Your streak and past activities will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
