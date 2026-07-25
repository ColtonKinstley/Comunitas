/**
 * The top-of-history summary. Deliberately celebratory: the number that gets
 * the big type is the one going *up*.
 */
import { Card } from "../../components/Card";
import type { HistoryResponse } from "../../lib/types";

interface StreakHeaderProps {
  history: HistoryResponse;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{label}</p>
    </div>
  );
}

export function StreakHeader({ history }: StreakHeaderProps) {
  const { currentStreak, bestStreak, attendedCount, totalCount, adherence } = history;
  const percent = Math.round(adherence * 100);

  return (
    <Card>
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none" aria-hidden>
          🔥
        </span>
        <div className="min-w-0">
          <p className="text-3xl font-bold text-ink">
            {currentStreak} {currentStreak === 1 ? "week" : "weeks"}
          </p>
          <p className="text-base text-ink-soft">
            {currentStreak > 0 ? "in a row right now" : "on the go — next one starts your streak"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Stat value={`${bestStreak}`} label={bestStreak === 1 ? "best week" : "best run"} />
        <Stat value={`${attendedCount}/${totalCount}`} label="turned up" />
        <Stat value={`${percent}%`} label="of the time" />
      </div>

      <div className="mt-4">
        <div
          className="h-3 overflow-hidden rounded-full bg-canvas"
          role="img"
          aria-label={`You have been to ${percent}% of your pod's activities`}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
