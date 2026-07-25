/**
 * Month-grid maths. Built straight on date-fns — a calendar library would be
 * more code to style around than to write.
 */
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { EventWithRsvp } from "../../lib/types";

/** Monday-first, the way a UK wall calendar reads. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Stable per-day bucket key in local time (never UTC — the grid is local). */
export const dayKey = (date: Date): string => format(date, "yyyy-MM-dd");

/** Whole weeks covering `month`, so the grid always has complete rows. */
export function monthWeeks(month: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTIONS),
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Events bucketed by local calendar day, each bucket sorted by start time. */
export function groupEventsByDay(events: EventWithRsvp[]): Map<string, EventWithRsvp[]> {
  const byDay = new Map<string, EventWithRsvp[]>();

  for (const event of events) {
    const key = dayKey(new Date(event.startsAt));
    const bucket = byDay.get(key);
    if (bucket) bucket.push(event);
    else byDay.set(key, [event]);
  }

  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return byDay;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** ±`months` whole months around an anchor — one fetch covers a lot of paging. */
export function rangeAround(anchor: Date, months = 3): DateRange {
  return {
    from: startOfMonth(subMonths(anchor, months)),
    to: endOfMonth(addMonths(anchor, months)),
  };
}

export const rangeCovers = (range: DateRange, month: Date): boolean =>
  startOfMonth(month) >= range.from && endOfMonth(month) <= range.to;
