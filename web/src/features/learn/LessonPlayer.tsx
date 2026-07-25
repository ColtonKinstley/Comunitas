/**
 * The immersive lesson player: one step at a time under a thin progress bar,
 * ending on a completion screen that records the score. Saving is
 * fire-with-retry — a failed POST shows a retry but never blocks leaving.
 */
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button, LinkButton } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { ApiError, completeLesson } from "../../lib/api";
import type { Lesson, LessonStep } from "./track";

type ChoiceStep = Extract<LessonStep, { kind: "choice" }>;
type InfoStep = Extract<LessonStep, { kind: "info" }>;

export function LessonPlayer({ lesson, patientId }: { lesson: Lesson; patientId: string }) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const steps = lesson.steps;
  const totalQuestions = steps.filter((s) => s.kind === "choice").length;
  const finished = stepIndex >= steps.length;
  const step = finished ? null : steps[stepIndex];

  const advance = useCallback((wasCorrect?: boolean) => {
    if (wasCorrect) setCorrectCount((n) => n + 1);
    setStepIndex((i) => i + 1);
  }, []);

  return (
    <div className="flex min-h-full flex-col px-5 pb-6">
      {/* Close + progress. The close button must always work, whatever the POST is doing. */}
      <div className="sticky top-0 z-10 -mx-5 flex items-center gap-3 bg-canvas px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate("/learn")}
          aria-label="Close lesson"
          className="tap -ml-2 inline-flex items-center justify-center rounded-xl text-ink-soft hover:bg-brand-50 hover:text-ink"
        >
          <X size={24} aria-hidden />
        </button>
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={Math.min(stepIndex, steps.length)}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(Math.min(stepIndex, steps.length) / steps.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold text-ink-faint">
          {Math.min(stepIndex + 1, steps.length)} of {steps.length}
        </span>
      </div>

      {finished || !step ? (
        <CompletionScreen
          lesson={lesson}
          patientId={patientId}
          correctCount={correctCount}
          totalQuestions={totalQuestions}
        />
      ) : step.kind === "info" ? (
        <InfoStepView key={stepIndex} step={step} onContinue={() => advance()} />
      ) : (
        <ChoiceStepView key={stepIndex} step={step} onContinue={advance} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- info step */

function InfoStepView({ step, onContinue }: { step: InfoStep; onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
        <span className="text-6xl" aria-hidden>
          {step.emoji}
        </span>
        <h1 className="text-2xl text-ink">{step.title}</h1>
        <p className="max-w-[34ch] text-base text-ink-soft">{step.body}</p>
      </div>
      <Button size="lg" fullWidth onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------- choice step */

function ChoiceStepView({
  step,
  onContinue,
}: {
  step: ChoiceStep;
  onContinue: (wasCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const wasCorrect = selected === step.correctIndex;

  const optionClasses = (index: number): string => {
    const base =
      "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 " +
      "text-left text-base font-semibold transition-colors";
    if (!revealed) {
      return [
        base,
        index === selected
          ? "border-brand-400 bg-brand-50 text-brand-800"
          : "border-line bg-surface text-ink hover:border-brand-200",
      ].join(" ");
    }
    if (index === step.correctIndex) return `${base} border-brand-500 bg-brand-100 text-brand-800`;
    if (index === selected) return `${base} border-danger-500 bg-danger-100 text-danger-700`;
    return `${base} border-line bg-surface text-ink-faint`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="pt-6 text-xl text-ink">{step.prompt}</h1>

      <div className="mt-5 space-y-3" role="radiogroup" aria-label="Answers">
        {step.options.map((option, index) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={index === selected}
            disabled={revealed}
            onClick={() => setSelected(index)}
            className={optionClasses(index)}
          >
            <span>{option}</span>
            {revealed && index === step.correctIndex && (
              <Check size={22} className="shrink-0" aria-label="Correct answer" />
            )}
            {revealed && index === selected && index !== step.correctIndex && (
              <X size={22} className="shrink-0" aria-label="Your answer" />
            )}
          </button>
        ))}
      </div>

      {revealed && (
        <div
          className={[
            "mt-5 rounded-2xl border p-4",
            wasCorrect ? "border-brand-300 bg-brand-50" : "border-danger-100 bg-danger-100/60",
          ].join(" ")}
        >
          <p className={`text-base font-bold ${wasCorrect ? "text-brand-800" : "text-danger-700"}`}>
            {wasCorrect ? "Spot on!" : "Not quite"}
          </p>
          <p className="mt-1 text-base text-ink-soft">{step.explanation}</p>
        </div>
      )}

      <div className="mt-auto pt-6">
        {revealed ? (
          <Button size="lg" fullWidth onClick={() => onContinue(wasCorrect)}>
            Continue
          </Button>
        ) : (
          <Button size="lg" fullWidth disabled={selected === null} onClick={() => setRevealed(true)}>
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ completion */

function CompletionScreen({
  lesson,
  patientId,
  correctCount,
  totalQuestions,
}: {
  lesson: Lesson;
  patientId: string;
  correctCount: number;
  totalQuestions: number;
}) {
  const [saving, setSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const attempted = useRef(false);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await completeLesson(patientId, lesson.id, { correct: correctCount, total: totalQuestions });
      setSaving(false);
    } catch (cause) {
      setSaving(false);
      setSaveError(
        cause instanceof ApiError ? cause.message : "We couldn't save your progress just now.",
      );
    }
  }, [patientId, lesson.id, correctCount, totalQuestions]);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void save();
  }, [save]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
        <span className="text-6xl" aria-hidden>
          🎉
        </span>
        <h1 className="text-2xl text-ink">Lesson complete!</h1>
        <p className="text-base text-ink-soft">
          You got{" "}
          <strong className="text-ink">
            {correctCount} of {totalQuestions}
          </strong>{" "}
          questions right.
        </p>
        <Chip tone="accent">✨ +10 XP</Chip>

        {saving && <p className="text-sm text-ink-faint">Saving your progress…</p>}
        {saveError && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-danger-700">{saveError}</p>
            <Button variant="secondary" onClick={() => void save()}>
              Retry saving
            </Button>
          </div>
        )}
      </div>
      <LinkButton to="/learn" size="lg" fullWidth>
        Back to your lessons
      </LinkButton>
    </div>
  );
}
