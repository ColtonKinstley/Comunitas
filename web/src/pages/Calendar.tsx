/**
 * Month view plus an agenda for the day you tapped. The month grid is built on
 * date-fns rather than a calendar library so the touch targets and colours can
 * follow the rest of the app.
 */
import { isSameMonth, isToday, startOfDay, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { DayAgenda } from "../features/calendar/DayAgenda";
import { MonthGrid } from "../features/calendar/MonthGrid";
import { dayKey, groupEventsByDay, rangeAround, rangeCovers } from "../features/calendar/month";
import { formatDayLong } from "../features/events/format";
import { statusMeta } from "../features/events/status";
import { ErrorCard, LoadingNote } from "../features/events/states";
import { useAsync } from "../features/events/useAsync";
import { getPatientEvents } from "../lib/api";
import { useCurrentPatient } from "../lib/patient";
import type { EventStatus } from "../lib/types";

const LEGEND: EventStatus[] = ["confirmed", "proposed", "completed"];

export default function Calendar() {
  const patientId = useCurrentPatient();

  // One "now" for the whole render tree, so today never shifts mid-session.
  const today = useMemo(() => startOfDay(new Date()), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);

  // Fetch a wide window once; only widen it if the user pages outside it.
  const [range, setRange] = useState(() => rangeAround(today));
  useEffect(() => {
    setRange((current) => (rangeCovers(current, month) ? current : rangeAround(month)));
  }, [month]);

  const key = patientId ? `${patientId}|${range.from.getTime()}|${range.to.getTime()}` : null;
  const { data, error, loading, reload } = useAsync(key, () =>
    getPatientEvents(patientId ?? "", {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }),
  );

  const eventsByDay = useMemo(() => groupEventsByDay(data ?? []), [data]);
  const dayEvents = eventsByDay.get(dayKey(selected)) ?? [];
  const monthHasEvents = useMemo(
    () => (data ?? []).some((event) => isSameMonth(new Date(event.startsAt), month)),
    [data, month],
  );

  const changeMonth = (next: Date) => {
    setMonth(next);
    // Keep the agenda pointed at something sensible in the month you're viewing.
    setSelected(isSameMonth(today, next) ? today : next);
  };

  const selectDay = (day: Date) => {
    setSelected(day);
    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
  };

  return (
    <div className="pb-10">
      <PageHeader title="Calendar" subtitle="What's on, and when" />

      <div className="space-y-5 px-5 pt-5">
        {error ? (
          <ErrorCard message={error} onRetry={reload} />
        ) : (
          <>
            <MonthGrid
              month={month}
              selected={selected}
              eventsByDay={eventsByDay}
              onSelect={selectDay}
              onMonthChange={changeMonth}
            />

            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {LEGEND.map((status) => (
                <li key={status} className="flex items-center gap-1.5 text-sm text-ink-faint">
                  <span
                    className={`size-2 rounded-full ${statusMeta(status).dot}`}
                    aria-hidden
                  />
                  {statusMeta(status).label}
                </li>
              ))}
            </ul>

            <section>
              <h2 className="mb-3 px-1 text-lg font-bold text-ink">
                {isToday(selected) ? "Today" : formatDayLong(selected)}
              </h2>

              {loading ? (
                <LoadingNote label="Loading your activities…" />
              ) : (
                <DayAgenda events={dayEvents} monthHasEvents={monthHasEvents} />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
