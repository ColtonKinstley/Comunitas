/** Loads the patient profile and lets sections push refreshed copies back. */
import { useCallback, useEffect, useState } from "react";
import { getPatient } from "../../lib/api";
import type { PatientProfile } from "../../lib/types";

export interface ProfileDataState {
  patient: PatientProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Called by each section with the profile the PATCH handed back. */
  setPatient: (patient: PatientProfile) => void;
}

export function useProfileData(patientId: string | null): ProfileDataState {
  const [patient, setPatientState] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setPatient = useCallback((next: PatientProfile) => setPatientState(next), []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await getPatient(patientId);
        if (!cancelled) setPatientState(result);
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

  return { patient, loading, error, reload, setPatient };
}
