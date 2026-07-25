/**
 * The typed fallback. Same conversation, same tools — it just skips the
 * microphone. Kept deliberately plain: one big field, one big button.
 */
import { SendHorizonal } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

interface TextComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function TextComposer({ onSend, disabled }: TextComposerProps) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className="sticky bottom-0 -mx-5 mt-4 flex items-end gap-2 border-t border-line bg-canvas/95 px-5 pt-3 pb-4 backdrop-blur-sm"
      data-testid="text-composer"
    >
      <label htmlFor="induction-reply" className="sr-only">
        Your answer
      </label>
      <input
        id="induction-reply"
        data-testid="text-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        placeholder="Type your answer…"
        className="min-h-[52px] flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-base text-ink placeholder:text-ink-faint focus:border-brand-400 focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        data-testid="text-send"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send answer"
        className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <SendHorizonal size={22} aria-hidden />
      </button>
    </form>
  );
}
