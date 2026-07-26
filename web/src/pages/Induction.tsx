/**
 * The voice induction.
 *
 * Intro (what's about to happen + mic) → connect → live conversation with
 * captions and a profile card that fills in as the interviewer learns things →
 * "we found your pod" → /home.
 *
 * `?mode=text` (or a refused microphone) runs the identical conversation
 * typed instead of spoken — that path is what headless QA drives.
 */
import { AlertTriangle, Keyboard, LoaderCircle, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, LinkButton } from "../components/Button";
import { createMyPatient } from "../lib/api";
import { authClient } from "../lib/auth";
import { getCurrentPatientId, setCurrentPatientId } from "../lib/patient";
import { Captions } from "../features/induction/Captions";
import { LiveProfileCard } from "../features/induction/LiveProfileCard";
import { PodReveal } from "../features/induction/PodReveal";
import { TextComposer } from "../features/induction/TextComposer";
import { VoiceIndicator } from "../features/induction/VoiceIndicator";
import { InductionStyles } from "../features/induction/styles";
import { useInduction } from "../features/induction/useInduction";

const WHAT_TO_EXPECT = [
  "Where you live, and how far you're happy to travel",
  "What's going on with your health, in your own words",
  "What you enjoy doing, and when you're free",
];

export default function Induction() {
  const [params] = useSearchParams();
  const audioRef = useRef<HTMLAudioElement>(null);
  const textOnly = params.get("mode") === "text";
  // `?resume=1` (banner, profile redo) continues on the current patient
  // instead of minting a fresh one.
  const resume = params.get("resume") === "1";

  const induction = useInduction({
    audioRef,
    initialMode: textOnly ? "text" : "voice",
    initialPatientId: resume ? getCurrentPatientId() : null,
  });

  const {
    phase,
    mode,
    error,
    captions,
    profile,
    assistantSpeaking,
    userSpeaking,
    thinking,
    completion,
    start,
    retry,
    sendText,
  } = induction;

  return (
    <>
      <InductionStyles />
      {/* Remote audio from the model. Hidden — it's a speaker, not a control. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {phase === "intro" && <Intro mode={mode} onStart={start} />}

      {(phase === "permission" || phase === "connecting") && (
        <Connecting waitingForMic={phase === "permission"} />
      )}

      {(phase === "live" || phase === "completing") && (
        /* The conversation is the screen: it takes every pixel the indicator,
           the collapsed profile summary and the composer don't need. */
        <div className="flex min-h-full flex-col px-5 pt-5 pb-0">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <VoiceIndicator
              assistantSpeaking={assistantSpeaking}
              userSpeaking={userSpeaking}
              thinking={thinking}
              mode={mode}
            />
          </div>

          {/* Grows into all the space the rest of the column doesn't claim, and
              never shrinks below a readable few lines. */}
          <div className="mt-3 flex min-h-[9rem] flex-1 flex-col">
            <Captions captions={captions} />
          </div>

          <div className="mt-3 shrink-0">
            <LiveProfileCard profile={profile} />
          </div>

          {mode === "text" && <TextComposer onSend={sendText} disabled={phase !== "live"} />}
          {mode !== "text" && <div className="h-4 shrink-0" />}

          {phase === "completing" && <FindingOverlay />}
        </div>
      )}

      {phase === "complete" && completion && <PodReveal result={completion} />}

      {phase === "error" && <ErrorState message={error} onRetry={retry} />}
    </>
  );
}

/* ---------------------------------------------------------------- intro */

function Intro({ mode, onStart }: { mode: "voice" | "text"; onStart: () => void }) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState(false);

  // A signed-in user can skip the induction: create their bare patient record
  // so the rest of the app (profile, sign-out) is reachable. "Not now" would
  // trap them — the welcome screen bounces a signed-in, patient-less visitor
  // straight back here.
  async function skip() {
    if (skipping) return;
    setSkipping(true);
    setSkipError(false);
    try {
      const { patientId } = await createMyPatient();
      if (!patientId) throw new Error("no patient");
      setCurrentPatientId(patientId);
      navigate("/profile", { replace: true });
    } catch {
      setSkipError(true);
      setSkipping(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col px-6 pt-12 pb-8">
      <div className="flex flex-1 flex-col">
        <span
          className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"
          aria-hidden
        >
          {mode === "text" ? <Keyboard size={30} /> : <Mic size={30} />}
        </span>

        <h1 className="text-3xl font-bold text-balance text-brand-900">
          Let's have a quick chat
        </h1>
        <p className="mt-4 text-lg text-balance text-ink-soft">
          {mode === "text"
            ? "Type your answers and our health companion will guide you through. About five minutes — no forms."
            : "Our health companion will ask you a few questions out loud. Just answer in your own words — no forms, about five minutes."}
        </p>

        <ul className="mt-7 space-y-3">
          {WHAT_TO_EXPECT.map((item) => (
            <li key={item} className="flex gap-3 text-base text-ink">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
                aria-hidden
              >
                <Sparkles size={14} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex gap-3 rounded-2xl border border-line bg-surface p-4">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-sm text-ink-soft">
            This isn't medical advice and nothing here replaces your GP. We only ask what we need
            to find you the right local group.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Button size="lg" fullWidth onClick={onStart} data-testid="start-induction">
          {mode === "text" ? <Keyboard size={22} aria-hidden /> : <Mic size={22} aria-hidden />}
          {mode === "text" ? "Start the conversation" : "Start — allow the microphone"}
        </Button>
        {mode !== "text" && (
          <p className="text-center text-sm text-ink-faint">
            Your browser will ask permission to use your microphone. No microphone? We'll switch
            to typing automatically.
          </p>
        )}
        {session ? (
          <>
            {skipError && (
              <p role="alert" className="text-center text-sm text-danger-700">
                Couldn't skip right now — try again.
              </p>
            )}
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => void skip()}
              disabled={skipping}
            >
              {skipping ? "Setting up…" : "Skip for now — do this later"}
            </Button>
          </>
        ) : (
          <LinkButton to="/welcome" variant="ghost" size="md" fullWidth>
            Not now
          </LinkButton>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- connecting */

function Connecting({ waitingForMic }: { waitingForMic: boolean }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
      <LoaderCircle size={44} className="animate-spin text-brand-600" aria-hidden />
      <h1 className="mt-6 text-2xl text-ink">
        {waitingForMic ? "Waiting for your microphone" : "Connecting…"}
      </h1>
      <p className="mt-2 max-w-[30ch] text-base text-balance text-ink-soft">
        {waitingForMic
          ? "Please choose “Allow” when your browser asks."
          : "One moment — we're getting your companion on the line."}
      </p>
    </div>
  );
}

function FindingOverlay() {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-canvas/92 px-8 text-center backdrop-blur-sm"
      data-testid="finding-pod"
    >
      <LoaderCircle size={44} className="animate-spin text-brand-600" aria-hidden />
      <p className="mt-6 text-2xl font-bold text-brand-900">Finding your group…</p>
      <p className="mt-2 text-base text-ink-soft">Matching you with people near you.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- error */

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-full flex-col px-6 pt-12 pb-8" data-testid="induction-error">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-danger-100 text-danger-700"
          aria-hidden
        >
          <AlertTriangle size={30} />
        </span>
        <h1 className="text-2xl text-ink">That didn't work</h1>
        <p className="mt-3 max-w-[32ch] text-base text-balance text-ink-soft" role="alert">
          {message ?? "We couldn't start the conversation."}
        </p>
      </div>
      <div className="mt-8 space-y-3">
        <Button size="lg" fullWidth onClick={onRetry}>
          Try again
        </Button>
        <LinkButton to="/welcome" variant="ghost" size="md" fullWidth>
          Back to start
        </LinkButton>
      </div>
    </div>
  );
}
