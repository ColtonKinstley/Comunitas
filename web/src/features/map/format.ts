import { format, isToday, isTomorrow } from "date-fns";

/** "Today, 10:00am" / "Sat 27 Jul, 10:00am" — never a bare ISO string. */
export function friendlyDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  const time = format(date, "h:mmaaa");
  if (isToday(date)) return `Today, ${time}`;
  if (isTomorrow(date)) return `Tomorrow, ${time}`;
  return `${format(date, "EEE d MMM")}, ${time}`;
}

/** "3 km" / "1.5 km" — no trailing ".0". */
export const formatKm = (km: number) => `${Number(km.toFixed(1))} km`;
