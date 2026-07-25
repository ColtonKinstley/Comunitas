/**
 * Live captions. Large type, high contrast — for anyone who can't quite catch
 * the audio, and for the demo audience who need to see it working.
 */
import { useEffect, useRef } from "react";
import type { Caption } from "./types";

export function Captions({ captions }: { captions: Caption[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [captions]);

  return (
    <div
      className="max-h-[13.5rem] min-h-[8rem] space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface/70 p-4"
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
      <div ref={endRef} />
    </div>
  );
}
