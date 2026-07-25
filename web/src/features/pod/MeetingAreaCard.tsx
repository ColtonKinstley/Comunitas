/**
 * "Where does this actually happen?" — answered without a map: how far the
 * pod's centre of gravity is from you, and the places it usually meets.
 */
import { ChevronRight, Footprints, MapPin } from "lucide-react";
import { Link } from "react-router";
import { Card } from "../../components/Card";
import type { MapResponse, PodSummary } from "../../lib/types";
import { distanceBetween, formatDistance, frequentVenues, walkingMinutes } from "./geo";

interface MeetingAreaCardProps {
  pod: PodSummary;
  map: MapResponse | null;
}

export function MeetingAreaCard({ pod, map }: MeetingAreaCardProps) {
  const centroid = { lat: pod.centroidLat, lng: pod.centroidLng };
  const distanceKm = distanceBetween(map?.patient ?? null, centroid);
  const venues = frequentVenues(map?.events ?? []);
  const postcode = map?.patient.postcode ?? null;
  const radiusKm = map?.patient.travelRadiusKm ?? null;
  const withinRadius = distanceKm !== null && radiusKm !== null && distanceKm <= radiusKm;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
          aria-hidden
        >
          <MapPin size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg text-ink">Where you meet</h2>
          {distanceKm === null ? (
            <p className="mt-1 text-base text-ink-soft">
              We'll show how far this is once we know your postcode.
            </p>
          ) : (
            <>
              <p className="mt-1 text-base text-ink-soft">
                Your pod's meeting area sits{" "}
                <strong className="text-ink">{formatDistance(distanceKm)}</strong>
                {postcode ? ` from ${postcode}` : ""} — about {walkingMinutes(distanceKm)} minutes
                on foot.
              </p>
              {radiusKm !== null && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  <Footprints size={17} aria-hidden />
                  {withinRadius
                    ? `Comfortably inside the ${radiusKm} km you said you'd travel`
                    : `A little beyond the ${radiusKm} km you said you'd travel`}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {venues.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-semibold tracking-wide text-ink-faint uppercase">
            Usual spots
          </p>
          <ul className="mt-2 space-y-1">
            {venues.map((venue) => (
              <li key={venue.name} className="text-base text-ink-soft">
                {venue.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/map"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-brand-700 underline underline-offset-4"
      >
        See on map
        <ChevronRight size={20} aria-hidden />
      </Link>
    </Card>
  );
}
