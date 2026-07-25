/**
 * "Current patient" is the app's whole notion of identity — no auth in this
 * build. It lives in localStorage under `comunitas.patientId`.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router";

const STORAGE_KEY = "comunitas.patientId";

export function getCurrentPatientId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing / storage disabled.
    return null;
  }
}

export function setCurrentPatientId(patientId: string | null): void {
  try {
    if (patientId) window.localStorage.setItem(STORAGE_KEY, patientId);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing sensible to do; the app will just ask again on next load.
  }
}

export const clearCurrentPatient = () => setCurrentPatientId(null);

/**
 * Returns the current patient id, bouncing to the welcome screen when there
 * isn't one. Returns `null` for the render or two before the redirect lands —
 * guard on it before fetching.
 */
export function useCurrentPatient(): string | null {
  const navigate = useNavigate();
  const patientId = getCurrentPatientId();

  useEffect(() => {
    if (!patientId) navigate("/", { replace: true });
  }, [patientId, navigate]);

  return patientId;
}
