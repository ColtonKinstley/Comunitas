import { MapPin } from "lucide-react";
import { useParams } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show what/where/when, a map thumb, RSVP and who's going. */
export default function EventDetail() {
  const { id } = useParams();
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Activity" subtitle="What, where and who" back />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<MapPin size={28} />}
          title="Coming soon"
          message={
            patientId
              ? `Details for activity ${id ?? "—"} will appear here.`
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
