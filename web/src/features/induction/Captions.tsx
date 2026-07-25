/**
 * The conversation itself. Large type, high contrast — for anyone who can't
 * quite catch the audio, and for the demo audience who need to see it working.
 *
 * This is the main event on the induction screen, so it takes whatever height
 * is going and scrolls inside itself. Your own turns — typed or transcribed —
 * sit on the right in brand colour; the companion's sit on the left.
 */
import { useEffect, useRef } from "react";
import type { Caption } from "./types";

export function Captions({ captions }: { captions: Caption[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Set scrollTop directly rather than scrollIntoView: transcript deltas
    // arrive many times a second, and each smooth scroll would cancel the last
    // one, so the newest bubble (usually yours) never actually came into view.
    el.scrollTop = el.scrollHeight;
  }, [captions]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface/70 p-4"
      data-testid="captions"
      aria-live="polite"
      aria-label="Conversation"
    >
      {captions.length === 0 && (
        <p className="py-6 text-center text-base text-ink-faint italic">
          The conversation will appear here…
        </p>
      )}

      {captions.map((c) => (
        <div key={c.id} className={c.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <p
            data-role={c.role}
            data-testid={c.role === "user" ? "caption-user" : "caption-assistant"}
            className={[
              "induction-rise max-w-[85%] rounded-2xl px-3.5 py-2 text-base",
              c.role === "user"
                ? "rounded-br-md bg-brand-600 text-white"
                : "rounded-bl-md bg-canvas text-ink",
              c.final ? "" : "opacity-80",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {c.text || "…"}
          </p>
        </div>
      ))}
    </div>
  );
}
