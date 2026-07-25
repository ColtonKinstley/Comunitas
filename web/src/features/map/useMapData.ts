/**
 * Loads `GET /api/patients/:id/map` — you, your travel radius, your pod's
 * members and meeting point, and the venues of what's coming up.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError, getPatientMap } from "../../lib/api";
import type { MapResponse } from "../../lib/types";

export type MapDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: MapResponse };

export function useMapData(patientId: string | null) {
  const [state, setState] = useState<MapDataState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!patientId) return;
    let live = true;
    setState({ status: "loading" });

    getPatientMap(patientId)
      .then((data) => {
        if (live) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!live) return;
        const message =
          error instanceof ApiError ? error.message : "Something went wrong loading your map.";
        setState({ status: "error", message });
      });

    return () => {
      live = false;
    };
  }, [patientId, attempt]);

  return { state, reload };
}
