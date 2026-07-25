/** Loads the adherence story for the current patient. */
import { useCallback, useEffect, useState } from "react";
import { getPatientHistory } from "../../lib/api";
import type { HistoryResponse } from "../../lib/types";

export interface HistoryState {
  data: HistoryResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHistory(patientId: string | null): HistoryState {
  const [data, setData] = useState<HistoryResponse | null>(null);
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
        const history = await getPatientHistory(patientId);
        if (cancelled) return;
        // Newest first — the API already sorts this way, but don't rely on it.
        setData({
          ...history,
          events: [...history.events].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
        });
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
