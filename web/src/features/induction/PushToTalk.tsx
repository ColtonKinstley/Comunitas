/**
 * The push-to-talk bar. Hold the big button (or the space bar) to speak;
 * release to send. Automatic voice detection kept misfiring — pauses read as
 * "done", background noise read as speech — so the person controls the turn.
 */
import { Keyboard, Mic } from "lucide-react";
import { useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface PushToTalkProps {
  /** True while the person is holding the button / space bar. */
  holding: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  onSwitchToText: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
  );
}

export function PushToTalk({ holding, disabled, onStart, onStop, onSwitchToText }: PushToTalkProps) {
  /* Space bar as a second push-to-talk trigger — hold to talk, release to send. */
  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      e.preventDefault(); // don't scroll the captions or "click" a focused button
      if (!e.repeat) onStart();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      e.preventDefault();
      onStop();
    };
    // Losing the window mid-hold would leave the mic hot — treat it as release.
    const onBlur = () => onStop();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onStop();
    };
  }, [disabled, onStart, onStop]);

  function press(e: ReactPointerEvent<HTMLButtonElement>) {
    // Capture so the release still lands here even if the finger drifts off.
    e.currentTarget.setPointerCapture(e.pointerId);
    onStart();
  }

  return (
    <div
      className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-canvas/95 px-5 pt-3 pb-4 backdrop-blur-sm"
      data-testid="push-to-talk"
    >
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          data-testid="ptt-button"
          disabled={disabled}
          aria-pressed={holding}
          aria-keyshortcuts="Space"
          onPointerDown={press}
          onPointerUp={onStop}
          onPointerCancel={onStop}
          onContextMenu={(e) => e.preventDefault()}
          className={[
            "flex min-h-[60px] flex-1 touch-none items-center justify-center gap-3 rounded-2xl text-lg font-semibold text-white transition-colors select-none",
            holding ? "bg-accent-500" : "bg-brand-600 hover:bg-brand-700",
            "disabled:cursor-not-allowed disabled:opacity-45",
          ].join(" ")}
        >
          <Mic size={24} aria-hidden />
          {holding ? "Release to send" : "Hold to talk"}
        </button>
        <button
          type="button"
          data-testid="switch-to-text"
          onClick={onSwitchToText}
          aria-label="Switch to typing instead"
          className="flex w-[60px] shrink-0 items-center justify-center rounded-2xl border-2 border-line bg-surface text-ink-soft transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Keyboard size={24} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-sm text-ink-faint">
        Hold the button — or the space bar — while you speak. Prefer typing? Tap the keyboard.
      </p>
    </div>
  );
}
