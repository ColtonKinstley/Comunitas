/**
 * The three-way answer: Going / Maybe / Can't. Deliberately words, not icons
 * alone, and never smaller than a 48px target.
 */
import { Check, Meh, X, type LucideIcon } from "lucide-react";
import type { RsvpStatus } from "../../lib/types";

interface Option {
  value: RsvpStatus;
  label: string;
  Icon: LucideIcon;
  /** Styling when this is the chosen answer. */
  selected: string;
}

const OPTIONS: Option[] = [
  {
    value: "yes",
    label: "Going",
    Icon: Check,
    selected: "bg-brand-600 border-brand-600 text-white",
  },
  {
    value: "maybe",
    label: "Maybe",
    Icon: Meh,
    selected: "bg-accent-400 border-accent-400 text-accent-700",
  },
  {
    value: "no",
    label: "Can't",
    Icon: X,
    selected: "bg-danger-100 border-danger-500 text-danger-700",
  },
];

const IDLE =
  "bg-surface border-line text-ink-soft hover:border-brand-300 hover:bg-brand-50";

interface RsvpButtonsProps {
  value: RsvpStatus | null;
  pending: RsvpStatus | null;
  onChoose: (status: RsvpStatus) => void;
  /** Screen-reader context, e.g. the event title. */
  eventTitle: string;
  disabled?: boolean;
}

export function RsvpButtons({
  value,
  pending,
  onChoose,
  eventTitle,
  disabled = false,
}: RsvpButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Reply to ${eventTitle}`}>
      {OPTIONS.map(({ value: option, label, Icon, selected }) => {
        const isSelected = value === option;
        const isPending = pending === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled || pending !== null}
            onClick={() => onChoose(option)}
            className={[
              "flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border-2",
              "px-2 text-base font-semibold transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-70",
              isSelected ? selected : IDLE,
              isPending ? "animate-pulse" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Icon size={19} strokeWidth={2.4} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** "4 going · 1 maybe" — only the parts that are non-zero. */
export function rsvpSummary(counts: { yes: number; maybe: number; no: number }): string {
  const parts: string[] = [];
  if (counts.yes > 0) parts.push(`${counts.yes} going`);
  if (counts.maybe > 0) parts.push(`${counts.maybe} maybe`);
  if (parts.length === 0) return "Nobody has replied yet";
  return parts.join(" · ");
}
