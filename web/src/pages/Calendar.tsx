import { CalendarDays } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show a month grid with event dots and an agenda for the selected day. */
export default function Calendar() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Calendar" subtitle="What's on, and when" />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "A month view of your pod's activities will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
