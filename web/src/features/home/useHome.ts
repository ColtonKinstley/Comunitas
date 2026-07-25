/**
 * Everything the home screen needs, in one fetch pass: the patient (for their
 * name and pod), their pod's members, the next few events and the streak.
 */
import { useCallback, useEffect, useState } from "react";
import { getPatient, getPatientEvents, getPatientHistory, getPod } from "../../lib/api";
import type {
  EventWithRsvp,
  HistoryResponse,
  PatientProfile,
  PodDetail,
  RsvpCounts,
  RsvpStatus,
} from "../../lib/types";

export interface HomeData {
  patient: PatientProfile;
  pod: PodDetail | null;
  /** Proposed + confirmed events starting from now, soonest first. */
  upcoming: EventWithRsvp[];
  history: HistoryResponse;
}

export interface HomeState {
  data: HomeData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Folds an RSVP response back into the loaded events without a refetch. */
  applyRsvp: (eventId: string, status: RsvpStatus, counts: RsvpCounts) => void;
}

export function useHome(patientId: string | null): HomeState {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const patient = await getPatient(patientId);
        const [upcoming, history, pod] = await Promise.all([
          getPatientEvents(patientId, {
            status: "proposed,confirmed",
            from: new Date().toISOString(),
          }),
          getPatientHistory(patientId),
          patient.pod ? getPod(patient.pod.id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const sorted = [...upcoming].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        setData({ patient, pod, upcoming: sorted, history });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId, nonce]);

  const applyRsvp = useCallback(
    (eventId: string, status: RsvpStatus, counts: RsvpCounts) => {
      setData((current) =>
        current
          ? {
              ...current,
              upcoming: current.upcoming.map((event) =>
                event.id === eventId ? { ...event, myRsvp: status, rsvpCounts: counts } : event,
              ),
            }
          : current,
      );
    },
    [],
  );

  return { data, loading, error, reload, applyRsvp };
}
