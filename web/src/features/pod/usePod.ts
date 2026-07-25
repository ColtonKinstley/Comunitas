/**
 * Pod screen data: the patient (to know which pod and which member is "you"),
 * the pod itself, and the map payload — which is where the meeting-area
 * centroid and the patient's own coordinates come from.
 */
import { useCallback, useEffect, useState } from "react";
import { getPatient, getPatientMap, getPod } from "../../lib/api";
import type { MapResponse, PatientProfile, PodDetail } from "../../lib/types";

export interface PodData {
  patient: PatientProfile;
  pod: PodDetail | null;
  map: MapResponse | null;
}

export interface PodState {
  data: PodData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePod(patientId: string | null): PodState {
  const [data, setData] = useState<PodData | null>(null);
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
        if (!patient.pod) {
          if (!cancelled) setData({ patient, pod: null, map: null });
          return;
        }
        const [pod, map] = await Promise.all([
          getPod(patient.pod.id),
          // The map payload is the only place the pod centroid and the
          // patient's coordinates arrive together, pre-jittered for privacy.
          getPatientMap(patientId).catch(() => null),
        ]);
        if (cancelled) return;
        setData({ patient, pod, map });
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

  return { data, loading, error, reload };
}
