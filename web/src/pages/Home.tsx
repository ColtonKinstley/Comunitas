import { House } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show: greeting, next event + RSVP, pod snapshot, streak chip. */
export default function Home() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Home" subtitle="Your week at a glance" />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<House size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "Your next activity, your pod and your streak will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
