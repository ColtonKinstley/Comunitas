/**
 * One lesson, played full-screen (the tab bar hides for `/learn/:lessonId`).
 * Unknown or still-locked lessons bounce straight back to the track.
 */
import { Navigate, useParams } from "react-router";
import { LessonPlayer } from "../features/learn/LessonPlayer";
import { findLesson } from "../features/learn/track";
import { useLearn } from "../features/learn/useLearn";
import { useCurrentPatient } from "../lib/patient";

export default function Lesson() {
  const patientId = useCurrentPatient();
  const { lessonId } = useParams();
  const lesson = lessonId ? findLesson(lessonId) : undefined;
  const learn = useLearn(patientId);

  if (!lesson) return <Navigate to="/learn" replace />;
  // `useCurrentPatient` is already redirecting to the welcome screen.
  if (!patientId) return null;
  if (learn.loading) return <LessonSkeleton />;
  // Can't tell whether it's locked without progress — let /learn show the error.
  if (learn.error) return <Navigate to="/learn" replace />;
  if (learn.stateOf(lesson.id) === "locked") return <Navigate to="/learn" replace />;

  return <LessonPlayer lesson={lesson} patientId={patientId} />;
}

function LessonSkeleton() {
  return (
    <div className="space-y-4 px-5 pt-5" aria-busy="true" aria-label="Loading the lesson">
      <div className="h-3 animate-pulse rounded-full bg-line/60" />
      <div className="h-64 animate-pulse rounded-2xl bg-line/50" />
      <div className="h-14 animate-pulse rounded-2xl bg-line/40" />
    </div>
  );
}
