const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Local-time Monday 00:00 of the week containing `d`, as a timestamp. */
export function startOfWeek(d: Date | number | string): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayOffset = (x.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  x.setDate(x.getDate() - mondayOffset);
  return x.getTime();
}

/**
 * Previous week's Monday. Re-normalised through `startOfWeek` rather than
 * subtracting 7 days of milliseconds so DST transitions do not drift the key.
 */
const previousWeek = (weekStart: number) => startOfWeek(weekStart - WEEK_MS + 12 * 60 * 60 * 1000);

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Weekly adherence streak: a week "counts" if the patient attended at least one
 * event in it. The current streak walks back from this week (or last week, if
 * this week's events have not happened yet) while each successive week counts.
 */
export function weeklyStreaks(attendedDates: (Date | string)[], now: Date = new Date()): StreakResult {
  const weeks = new Set(attendedDates.map((d) => startOfWeek(d)));
  if (weeks.size === 0) return { currentStreak: 0, bestStreak: 0 };

  // Current streak.
  let cursor = startOfWeek(now);
  if (!weeks.has(cursor)) cursor = previousWeek(cursor);
  let currentStreak = 0;
  while (weeks.has(cursor)) {
    currentStreak++;
    cursor = previousWeek(cursor);
  }

  // Best streak.
  const sorted = [...weeks].sort((a, b) => a - b);
  let bestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const week of sorted) {
    run = prev !== null && previousWeek(week) === prev ? run + 1 : 1;
    prev = week;
    if (run > bestStreak) bestStreak = run;
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}
