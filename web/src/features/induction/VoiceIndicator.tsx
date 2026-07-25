/**
 * The "something is happening" affordance. Three states, deliberately obvious:
 * the companion is talking, it's listening to you, or it's thinking.
 */
import { Ear, Keyboard, Loader2, Volume2 } from "lucide-react";
import type { Mode } from "./types";

interface VoiceIndicatorProps {
  assistantSpeaking: boolean;
  userSpeaking: boolean;
  thinking: boolean;
  mode: Mode;
}

export function VoiceIndicator({
  assistantSpeaking,
  userSpeaking,
  thinking,
  mode,
}: VoiceIndicatorProps) {
  const state = assistantSpeaking
    ? "speaking"
    : userSpeaking
      ? "listening"
      : thinking
        ? "thinking"
        : "idle";

  // In a typed conversation nobody is speaking, so don't say anyone is.
  const typed = mode === "text";

  const copy = {
    speaking: typed ? "Typing…" : "Speaking…",
    listening: typed ? "Reading your answer…" : "Listening…",
    thinking: "Thinking…",
    idle: typed ? "Type your answer below" : "Go ahead — I'm listening",
  }[state];

  const Icon = {
    speaking: typed ? Keyboard : Volume2,
    listening: typed ? Keyboard : Ear,
    thinking: Loader2,
    idle: typed ? Keyboard : Ear,
  }[state];

  const active = state === "speaking" || state === "listening";

  return (
    <div className="flex items-center gap-3.5" aria-live="polite" data-testid="voice-indicator">
      <span className="relative flex size-12 shrink-0 items-center justify-center">
        {active && (
          <>
            <span className="induction-ripple absolute inset-0 rounded-full bg-brand-400/40" />
            <span
              className="induction-ripple absolute inset-0 rounded-full bg-brand-400/30"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
        <span
          className={[
            "relative flex size-12 items-center justify-center rounded-full text-white transition-colors duration-300",
            state === "speaking"
              ? "bg-brand-600"
              : state === "listening"
                ? "bg-accent-500"
                : "bg-brand-300",
          ].join(" ")}
        >
          <Icon size={22} className={state === "thinking" ? "animate-spin" : undefined} aria-hidden />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink">{copy}</p>
        <p className="text-sm text-ink-faint">
          {mode === "text" ? "Typed conversation" : "Comunitas health companion"}
        </p>
      </div>
    </div>
  );
}
