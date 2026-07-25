/**
 * Human date/time strings. Everything is rendered in the browser's local zone —
 * the API sends UTC instants.
 */
import { format, isSameDay, isToday, isTomorrow, isYesterday } from "date-fns";

export const toDate = (iso: string): Date => new Date(iso);

/** `9:30am` */
export const formatTime = (iso: string): string => format(toDate(iso), "h:mmaaa");

/** `Sat 26 Jul` — or `Today` / `Tomorrow` when that reads better. */
export function formatDayShort(iso: string): string {
  const date = toDate(iso);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE d MMM");
}

/** `Sat 26 Jul, 9:30am` — the one-line "when" used across the feed. */
export const formatWhen = (iso: string): string =>
  `${formatDayShort(iso)}, ${formatTime(iso)}`;

/** `Saturday 26 July` — the long form for headers and the detail screen. */
export const formatDayLong = (date: Date): string => format(date, "EEEE d MMMM");

/** `9:30am – 11:00am`, or just the start when there is no end time. */
export function formatTimeRange(startsAt: string, endsAt: string | null): string {
  const start = formatTime(startsAt);
  if (!endsAt) return start;
  const end = toDate(endsAt);
  const suffix = isSameDay(toDate(startsAt), end)
    ? formatTime(endsAt)
    : `${format(end, "EEE d MMM")}, ${formatTime(endsAt)}`;
  return `${start} – ${suffix}`;
}

/** `July 2026` */
export const formatMonthTitle = (month: Date): string => format(month, "MMMM yyyy");
