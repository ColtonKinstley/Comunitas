/**
 * Human-friendly date phrasing for the home screen.
 *
 * The audience reads "Tomorrow, 9:30am" far faster than "27/07/2026 09:30",
 * so every time on this screen goes through `friendlyWhen`.
 */
import { differenceInCalendarDays, format, isThisYear } from "date-fns";

export function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** `"Priya Shah"` → `"Priya"`. Falls back to a friendly generic. */
export function firstNameOf(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "there";
}

/** `9:30am`, lower case, no leading zero. */
export function clockTime(date: Date): string {
  return format(date, "h:mmaaa");
}

/** `Today, 9:30am` · `Tomorrow, 9:30am` · `Monday, 10:00am` · `Thu 6 Aug, 9:30am`. */
export function friendlyWhen(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  const time = clockTime(date);
  const days = differenceInCalendarDays(date, now);

  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days > 1 && days < 7) return `${format(date, "EEEE")}, ${time}`;

  const day = isThisYear(date) ? format(date, "EEE d MMM") : format(date, "EEE d MMM yyyy");
  return `${day}, ${time}`;
}

/** `9:30am – 11:00am`, or just the start when there is no end. */
export function timeRange(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  if (!endsAt) return clockTime(start);
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return clockTime(start);
  return `${clockTime(start)} – ${clockTime(end)}`;
}
