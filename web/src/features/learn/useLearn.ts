/**
 * Loads stored lesson progress and derives each node's place on the path:
 * completed lessons are `done` (and stay repeatable), the first not-done
 * lesson in track order is `next`, and everything after it is `locked`.
 */
import { useMemo } from "react";
import { getLearnProgress } from "../../lib/api";
import type { LessonProgressEntry } from "../../lib/types";
import { useAsync } from "../events/useAsync";
import { allLessons } from "./track";

export type LessonNodeState = "done" | "next" | "locked";

export interface LearnState {
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Stored progress keyed by lesson slug. */
  progressById: Map<string, LessonProgressEntry>;
  stateOf: (lessonId: string) => LessonNodeState;
  lessonsDone: number;
  totalLessons: number;
  /** Derived, never stored: 10 XP per completed lesson. */
  xp: number;
}

export function useLearn(patientId: string | null): LearnState {
  const { data, loading, error, reload } = useAsync(
    patientId ? `learn:${patientId}` : null,
    () => getLearnProgress(patientId!),
  );

  return useMemo(() => {
    const lessons = allLessons();
    const progressById = new Map<string, LessonProgressEntry>(
      (data?.progress ?? []).map((entry) => [entry.lessonId, entry]),
    );

    // Only lessons still in the track count — a renamed slug shouldn't
    // inflate the totals or wedge the unlock sequence.
    const lessonsDone = lessons.filter((lesson) => progressById.has(lesson.id)).length;
    const nextLessonId = lessons.find((lesson) => !progressById.has(lesson.id))?.id ?? null;

    const stateOf = (lessonId: string): LessonNodeState => {
      if (progressById.has(lessonId)) return "done";
      if (lessonId === nextLessonId) return "next";
      return "locked";
    };

    return {
      loading,
      error,
      reload,
      progressById,
      stateOf,
      lessonsDone,
      totalLessons: lessons.length,
      xp: lessonsDone * 10,
    };
  }, [data, loading, error, reload]);
}
