import { CalendarCheck } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show upcoming activities with inline RSVP, past ones collapsed. */
export default function Events() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Activities" subtitle="Say yes to what suits you" />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "Your pod's upcoming activities will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
