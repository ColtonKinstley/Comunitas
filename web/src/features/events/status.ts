/**
 * One place that decides what an event status looks like, so the calendar dots,
 * the feed chips and the detail screen never disagree.
 */
import type { ChipTone } from "../../components/Chip";
import type { EventStatus } from "../../lib/types";

interface StatusMeta {
  /** Plain-language label — no jargon for this audience. */
  label: string;
  tone: ChipTone;
  /** Tailwind background class for the calendar dot. */
  dot: string;
}

const META: Record<EventStatus, StatusMeta> = {
  confirmed: { label: "Confirmed", tone: "success", dot: "bg-brand-600" },
  proposed: { label: "Suggested", tone: "accent", dot: "bg-accent-400" },
  completed: { label: "Done", tone: "muted", dot: "bg-ink-faint" },
  cancelled: { label: "Cancelled", tone: "danger", dot: "bg-danger-500" },
};

const FALLBACK: StatusMeta = { label: "Planned", tone: "neutral", dot: "bg-ink-faint" };

export const statusMeta = (status: EventStatus): StatusMeta => META[status] ?? FALLBACK;

/** Proposed events came from the agent, so they get a gentle explanation. */
export const AGENT_SUGGESTION_LINE =
  "Your Comunitas agent suggested this for your pod.";
