/**
 * RSVP state for one event, updated optimistically: the tap must feel instant,
 * the counts settle to whatever the server says a moment later.
 */
import { useRef, useState } from "react";
import { rsvp as postRsvp } from "../../lib/api";
import type { RsvpCounts, RsvpStatus } from "../../lib/types";

const EMPTY_COUNTS: RsvpCounts = { yes: 0, no: 0, maybe: 0 };

/** Moves one vote from `from` to `to` so the counts look right before the POST lands. */
function shiftCounts(
  counts: RsvpCounts,
  from: RsvpStatus | null,
  to: RsvpStatus,
): RsvpCounts {
  const next = { ...counts };
  if (from && from !== to) next[from] = Math.max(0, next[from] - 1);
  if (from !== to) next[to] = next[to] + 1;
  return next;
}

export interface RsvpState {
  myRsvp: RsvpStatus | null;
  counts: RsvpCounts;
  /** The choice currently in flight, for spinner/disabled styling. */
  pending: RsvpStatus | null;
  error: string | null;
  choose: (next: RsvpStatus) => void;
}

export function useRsvpState(
  eventId: string,
  patientId: string | null,
  initialRsvp: RsvpStatus | null,
  initialCounts: RsvpCounts | undefined,
): RsvpState {
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(initialRsvp);
  const [counts, setCounts] = useState<RsvpCounts>(initialCounts ?? EMPTY_COUNTS);
  const [pending, setPending] = useState<RsvpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-seed if this hook gets reused for a different event (list re-order, etc.).
  const seededFor = useRef(eventId);
  if (seededFor.current !== eventId) {
    seededFor.current = eventId;
    setMyRsvp(initialRsvp);
    setCounts(initialCounts ?? EMPTY_COUNTS);
    setPending(null);
    setError(null);
  }

  const choose = (next: RsvpStatus) => {
    if (!patientId || pending) return;

    const previousRsvp = myRsvp;
    const previousCounts = counts;

    setMyRsvp(next);
    setCounts(shiftCounts(previousCounts, previousRsvp, next));
    setPending(next);
    setError(null);

    void postRsvp(eventId, { patientId, status: next })
      .then((res) => {
        setMyRsvp(res.status);
        setCounts(res.rsvpCounts);
      })
      .catch(() => {
        setMyRsvp(previousRsvp);
        setCounts(previousCounts);
        setError("We couldn't save that. Please try again.");
      })
      .finally(() => setPending(null));
  };

  return { myRsvp, counts, pending, error, choose };
}
