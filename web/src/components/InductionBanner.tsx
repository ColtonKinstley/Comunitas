/**
 * Pinned above every tabbed screen until the patient completes the induction
 * (skipped it, or abandoned it mid-way). Tapping it re-enters the flow.
 */
import { ChevronRight, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { getPatient } from "../lib/api";
import { getCurrentPatientId } from "../lib/patient";
import type { InductionStatus } from "../lib/types";

export function InductionBanner() {
  const { pathname } = useLocation();
  const patientId = getCurrentPatientId();
  const [status, setStatus] = useState<InductionStatus | null>(null);

  // Re-checked on navigation so finishing the induction clears the banner
  // without a reload — one small request per screen change.
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    getPatient(patientId)
      .then((p) => {
        if (!cancelled) setStatus(p.inductionStatus);
      })
      .catch(() => {
        // API down or patient gone — the screens themselves surface that.
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, pathname]);

  if (!patientId || status === null || status === "complete") return null;

  return (
    <Link
      to="/induction"
      className="flex items-center gap-2.5 border-b border-accent-200 bg-accent-100 px-5 py-2.5 text-sm font-medium text-accent-700"
    >
      <Mic size={16} className="shrink-0" aria-hidden />
      <span className="flex-1">
        {status === "in_progress" ? "Finish your induction" : "Complete your induction"} to get
        matched with a pod
      </span>
      <ChevronRight size={16} className="shrink-0" aria-hidden />
    </Link>
  );
}
