/**
 * The learn track: one path of bite-sized lessons, unlocked in order.
 * Done nodes stay tappable for practice; the next node carries the accent.
 */
import { Check, GraduationCap, Lock, Play, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { TRACK, TRACK_TITLE, type Lesson } from "../features/learn/track";
import { useLearn, type LessonNodeState } from "../features/learn/useLearn";
import { useCurrentPatient } from "../lib/patient";

export default function Learn() {
  const patientId = useCurrentPatient();
  const { loading, error, reload, stateOf, lessonsDone, totalLessons, xp } = useLearn(patientId);

  return (
    <div className="pb-8">
      <PageHeader
        title="Learn"
        subtitle={
          <>
            {TRACK_TITLE} — a couple of minutes at a time
            {!loading && !error && (
              <span className="mt-2 flex flex-wrap gap-2">
                <Chip tone="accent">✨ {xp} XP</Chip>
                <Chip tone="brand">
                  {lessonsDone} of {totalLessons} lessons
                </Chip>
              </span>
            )}
          </>
        }
      />

      <div className="space-y-7 px-5 pt-5">
        {loading && <LearnSkeleton />}

        {!loading && error && (
          <EmptyState
            icon={<TriangleAlert size={28} />}
            title="We couldn't load your lessons"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {!loading && !error && (
          <>
            {TRACK.map((unit) => (
              <section key={unit.id} aria-label={unit.title}>
                <div className="flex items-start gap-3 px-1">
                  <span className="text-3xl" aria-hidden>
                    {unit.emoji}
                  </span>
                  <div>
                    <h2 className="text-lg text-ink">{unit.title}</h2>
                    <p className="text-base text-ink-soft">{unit.blurb}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-3">
                  {unit.lessons.map((lesson) => (
                    <LessonNode key={lesson.id} lesson={lesson} state={stateOf(lesson.id)} />
                  ))}
                </ul>
              </section>
            ))}

            {lessonsDone === totalLessons && (
              <EmptyState
                icon={<GraduationCap size={28} />}
                title="Track complete!"
                message="You've finished every lesson. Tap any of them again for a refresher."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LessonNode({ lesson, state }: { lesson: Lesson; state: LessonNodeState }) {
  if (state === "locked") {
    return (
      <li>
        <div className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-line bg-canvas px-4 py-3 opacity-75">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-line/70 text-ink-faint"
            aria-hidden
          >
            <Lock size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink-faint">{lesson.title}</p>
            <p className="text-sm text-ink-faint">Finish the lesson before to unlock</p>
          </div>
        </div>
      </li>
    );
  }

  const done = state === "done";
  return (
    <li>
      <Link
        to={`/learn/${lesson.id}`}
        className={[
          "flex min-h-[64px] items-center gap-4 rounded-2xl border bg-surface px-4 py-3 shadow-card transition-colors",
          done
            ? "border-line hover:border-brand-300 hover:bg-brand-50/40"
            : "border-accent-200 bg-accent-50 hover:border-accent-300",
        ].join(" ")}
      >
        <span
          className={[
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            done ? "bg-brand-600 text-white" : "bg-accent-300 text-accent-700",
          ].join(" ")}
          aria-hidden
        >
          {done ? <Check size={22} strokeWidth={2.6} /> : <Play size={20} className="ml-0.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">{lesson.title}</p>
          <p className="truncate text-sm text-ink-soft">{lesson.blurb}</p>
        </div>
        <span
          className={[
            "shrink-0 text-sm font-semibold",
            done ? "text-brand-700" : "text-accent-600",
          ].join(" ")}
        >
          {done ? "Done" : "Start"}
        </span>
      </Link>
    </li>
  );
}

function LearnSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your lessons">
      <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/50" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/40" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/30" />
    </div>
  );
}
