/**
 * The map itself: you at the centre, the area you're willing to travel, the
 * people in your pod, where the pod meets, and the venues of what's coming up.
 */
import "leaflet/dist/leaflet.css";
import { latLngBounds, type LatLngTuple, type Map as LeafletMap } from "leaflet";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router";
import type { MapResponse } from "../../lib/types";
import { formatKm, friendlyDateTime } from "./format";
import { eventIcon, memberIcon, podCentroidIcon, youIcon } from "./icons";
import { ALL_LAYERS, MapLegend, type MapLayers } from "./MapLegend";
import { MapStyles } from "./MapStyles";
import { KM_PER_DEGREE_LAT, MAP_COLORS } from "./theme";

/** Street names stay readable between these two. */
const MIN_FIT_ZOOM = 13;
const MAX_FIT_ZOOM = 15;

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface CommunityMapProps {
  data: MapResponse;
  /** The patient's location — resolved by the caller, which also handles the "no location" case. */
  center: LatLngTuple;
}

export function CommunityMap({ data, center }: CommunityMapProps) {
  const { patient, pod, members, events } = data;
  const [layers, setLayers] = useState<MapLayers>(ALL_LAYERS);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const toggle = (layer: keyof MapLayers) =>
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  /** Only members and venues we actually have a location for. */
  const locatedMembers = useMemo(
    () =>
      members.flatMap((member) =>
        member.lat !== null && member.lng !== null
          ? [{ ...member, position: [member.lat, member.lng] as LatLngTuple }]
          : [],
      ),
    [members],
  );

  const locatedEvents = useMemo(
    () =>
      events.flatMap((event) =>
        event.lat !== null && event.lng !== null
          ? [{ ...event, position: [event.lat, event.lng] as LatLngTuple }]
          : [],
      ),
    [events],
  );

  const podCentroid: LatLngTuple | null =
    pod && pod.centroidLat !== null && pod.centroidLng !== null
      ? [pod.centroidLat, pod.centroidLng]
      : null;

  const radiusKm = patient.travelRadiusKm;
  const [centerLat, centerLng] = center;
  const podLat = podCentroid?.[0];
  const podLng = podCentroid?.[1];

  /**
   * Everything worth having in view, including the far edges of the radius.
   * Keyed on plain numbers rather than on `center`, which is a fresh array each
   * render — otherwise every legend tap would yank the view back to the fit.
   */
  const bounds = useMemo(() => {
    const points: LatLngTuple[] = [[centerLat, centerLng]];

    if (radiusKm > 0) {
      const dLat = radiusKm / KM_PER_DEGREE_LAT;
      const dLng = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180));
      points.push(
        [centerLat + dLat, centerLng + dLng],
        [centerLat - dLat, centerLng - dLng],
      );
    }
    for (const member of locatedMembers) points.push(member.position);
    for (const event of locatedEvents) points.push(event.position);
    if (podLat !== undefined && podLng !== undefined) points.push([podLat, podLng]);

    return latLngBounds(points);
  }, [centerLat, centerLng, radiusKm, locatedMembers, locatedEvents, podLat, podLng]);

  const subtitle = [
    `Within ${formatKm(radiusKm)}`,
    patient.postcode ? `of ${patient.postcode}` : null,
    pod ? `· ${pod.name}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative h-full w-full">
      <MapStyles />
      <MapContainer
        ref={setMap}
        center={center}
        zoom={14}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
        <FitToCommunity bounds={bounds} />

        {layers.you && (
          <>
            <Circle
              center={center}
              radius={radiusKm * 1000}
              pathOptions={{
                color: MAP_COLORS.you,
                weight: 3,
                opacity: 0.8,
                dashArray: "9 8",
                fillColor: MAP_COLORS.youSoft,
                fillOpacity: 0.13,
              }}
            />
            <Marker position={center} icon={youIcon} title="You are here" zIndexOffset={800}>
              <Popup minWidth={200} maxWidth={250}>
                <PopupBody
                  eyebrow="You are here"
                  title={patient.postcode ?? "Your area"}
                  lines={[`Happy to travel about ${formatKm(radiusKm)}`]}
                />
              </Popup>
            </Marker>
          </>
        )}

        {layers.pod && (
          <>
            {locatedMembers.map((member) => (
              <Marker
                key={member.patientId}
                position={member.position}
                icon={memberIcon(member.firstName)}
                title={`Pod member · ${member.firstName}`}
              >
                <Popup minWidth={190} maxWidth={250}>
                  <PopupBody
                    eyebrow="Pod member"
                    title={member.firstName}
                    lines={["Approximate area only"]}
                  />
                </Popup>
              </Marker>
            ))}

            {podCentroid && (
              <Marker
                position={podCentroid}
                icon={podCentroidIcon}
                title="Where your pod meets"
                zIndexOffset={600}
              >
                <Popup minWidth={200} maxWidth={250}>
                  <PopupBody
                    eyebrow="Where your pod meets"
                    title={pod?.name ?? "Your pod"}
                    lines={pod?.memberCount ? [`${pod.memberCount} members`] : []}
                  />
                </Popup>
              </Marker>
            )}
          </>
        )}

        {layers.events &&
          locatedEvents.map((event) => (
            <Marker
              key={event.id}
              position={event.position}
              icon={eventIcon}
              title={event.title}
              zIndexOffset={700}
            >
              <Popup minWidth={215} maxWidth={260}>
                <div>
                  <p className="m-0 text-base leading-snug font-bold text-ink">{event.title}</p>
                  <p className="m-0 mt-1 text-sm font-semibold text-brand-700">
                    {friendlyDateTime(event.startsAt)}
                  </p>
                  {event.venueName && (
                    <p className="m-0 mt-0.5 text-sm text-ink-soft">{event.venueName}</p>
                  )}
                  <Link
                    to={`/events/${event.id}`}
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-base font-semibold !text-white no-underline hover:bg-brand-700"
                  >
                    View event
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <MapLegend
        subtitle={subtitle}
        layers={layers}
        onToggle={toggle}
        counts={{ events: locatedEvents.length, members: locatedMembers.length }}
      />

      <div className="absolute right-3 bottom-9 z-[1000] flex flex-col gap-2">
        <ZoomButton label="Zoom in" onClick={() => map?.zoomIn()}>
          <Plus size={22} aria-hidden />
        </ZoomButton>
        <ZoomButton label="Zoom out" onClick={() => map?.zoomOut()}>
          <Minus size={22} aria-hidden />
        </ZoomButton>
      </div>
    </div>
  );
}

/** Frames everything on load. Leaflet also needs a nudge once the frame settles. */
function FitToCommunity({ bounds }: { bounds: ReturnType<typeof latLngBounds> }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      map.invalidateSize({ animate: false });
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, {
        // Room for the legend card at the top and the attribution at the bottom.
        paddingTopLeft: [28, 128],
        paddingBottomRight: [28, 54],
        maxZoom: MAX_FIT_ZOOM,
        animate: false,
      });
      // A 3km radius is 6km across and the phone is 414px wide, so fitting the
      // whole circle drops the streets out of legibility. Hold a floor and let
      // the far edges of the radius bleed off screen instead.
      if (map.getZoom() < MIN_FIT_ZOOM) map.setZoom(MIN_FIT_ZOOM, { animate: false });
    };

    fit();
    const timer = window.setTimeout(fit, 120);
    return () => window.clearTimeout(timer);
  }, [map, bounds]);

  return null;
}

function PopupBody({
  eyebrow,
  title,
  lines,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
}) {
  return (
    <div>
      <p className="m-0 text-xs font-semibold tracking-wide text-ink-faint uppercase">{eyebrow}</p>
      <p className="m-0 mt-0.5 text-base leading-snug font-bold text-ink">{title}</p>
      {lines.map((line) => (
        <p key={line} className="m-0 mt-1 text-sm text-ink-soft">
          {line}
        </p>
      ))}
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-line bg-surface/95 text-ink shadow-card backdrop-blur active:bg-brand-50"
    >
      {children}
    </button>
  );
}
