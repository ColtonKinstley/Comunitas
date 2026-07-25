/**
 * Vertical timeline of past activities, newest first.
 *
 * A missed activity is marked, never scolded — "Missed this one" and a soft
 * red, nothing stronger.
 */
import { Check, MapPin, X } from "lucide-react";
import { Link } from "react-router";
import { format, isThisYear } from "date-fns";
import type { HistoryEntry } from "../../lib/types";

function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return isThisYear(date) ? format(date, "EEEE d MMMM") : format(date, "EEEE d MMMM yyyy");
}

function Marker({ attended }: { attended: boolean }) {
  return (
    <span
      className={[
        "flex size-9 shrink-0 items-center justify-center rounded-full border-2",
        attended
          ? "border-brand-300 bg-brand-100 text-brand-700"
          : "border-danger-100 bg-danger-100 text-danger-700",
      ].join(" ")}
      aria-hidden
    >
      {attended ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
    </span>
  );
}

function TimelineRow({ entry, last }: { entry: HistoryEntry; last: boolean }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && (
        <span
          className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-line"
          aria-hidden
        />
      )}
      <Marker attended={entry.attended} />
      {/* The whole row is the link — a title-sized tap target is not enough. */}
      <Link
        to={`/events/${entry.id}`}
        aria-label={`${entry.title} — see this activity`}
        className="-my-1 -mr-2 block min-h-[44px] min-w-0 flex-1 rounded-2xl px-2 py-1 transition-colors hover:bg-brand-50"
      >
        <h3 className="text-lg text-ink">{entry.title}</h3>
        <p className="mt-0.5 text-base text-ink-soft">{longDate(entry.startsAt)}</p>
        {entry.venueName && (
          <p className="mt-0.5 flex items-start gap-1.5 text-base text-ink-faint">
            <MapPin size={17} className="mt-1 shrink-0" aria-hidden />
            <span className="min-w-0">{entry.venueName}</span>
          </p>
        )}
        <p
          className={[
            "mt-1.5 text-sm font-semibold",
            entry.attended ? "text-brand-700" : "text-danger-700",
          ].join(" ")}
        >
          {entry.attended ? "You were there" : "Missed this one"}
        </p>
      </Link>
    </li>
  );
}

export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className="mt-1">
      {entries.map((entry, index) => (
        <TimelineRow key={entry.id} entry={entry} last={index === entries.length - 1} />
      ))}
    </ol>
  );
}
