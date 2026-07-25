import { MapPin } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show Leaflet + OSM: you, your travel radius, venues, pod centroid. */
export default function MapPage() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Near you" subtitle="Your area, your pod, your venues" />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<MapPin size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "A map of your travel radius and nearby venues will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
