import type { LatLngTuple } from "leaflet";
import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { CommunityMap } from "../features/map/CommunityMap";
import { useMapData } from "../features/map/useMapData";
import { useCurrentPatient } from "../lib/patient";

/** Leaflet + OSM: you, your travel radius, your pod, and where things happen. */
export default function MapPage() {
  const patientId = useCurrentPatient();
  const { state, reload } = useMapData(patientId);

  if (!patientId || state.status === "loading") return <MapSkeleton />;

  if (state.status === "error") {
    return (
      <MessageScreen
        title="We couldn't load your map"
        message={state.message}
        action={
          <Button onClick={reload} size="lg">
            Try again
          </Button>
        }
      />
    );
  }

  const { patient, pod, members, events } = state.data;
  const { lat, lng } = patient;
  const hasCommunity = pod !== null || members.length > 0 || events.length > 0;

  if (lat === null || lng === null || !hasCommunity) {
    return (
      <MessageScreen
        title="Your map is nearly ready"
        message="Complete your induction to see your community nearby — the people in your pod, where they meet, and what's on near you."
        action={
          <LinkButton to="/induction" size="lg">
            Complete your induction
          </LinkButton>
        }
      />
    );
  }

  const center: LatLngTuple = [lat, lng];

  return (
    <div className="h-full w-full">
      <CommunityMap data={state.data} center={center} />
    </div>
  );
}

/** Warm holding page while the tiles and the pod are on their way. */
function MapSkeleton() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="px-3 pt-3">
        <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-card">
          <div className="h-5 w-48 animate-pulse rounded-full bg-line" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-line/70" />
          <div className="mt-3 flex gap-2">
            <div className="h-11 w-24 animate-pulse rounded-full bg-line/70" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-line/70" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-line/70" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex-1 animate-pulse bg-page" />
      <p className="py-3 text-center text-sm text-ink-faint">Finding your community…</p>
    </div>
  );
}

function MessageScreen({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: ReactNode;
}) {
  return (
    <div className="pb-8">
      <PageHeader title="Near you" subtitle="Your area, your pod, your venues" />
      <div className="px-5 pt-5">
        <EmptyState icon={<MapPin size={28} />} title={title} message={message} action={action} />
      </div>
    </div>
  );
}
