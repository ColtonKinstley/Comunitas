/**
 * "We found your pod." The payoff for five minutes of talking — a named,
 * real, local group with people in it. Auto-advances to the app so nobody is
 * left staring at a screen wondering what to tap.
 */
import { ArrowRight, MapPin, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/Button";
import type { CompletionResult } from "./types";

const AUTO_ADVANCE_MS = 8000;

export function PodReveal({ result }: { result: CompletionResult }) {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(Math.round(AUTO_ADVANCE_MS / 1000));

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const jump = window.setTimeout(() => navigate("/home", { replace: true }), AUTO_ADVANCE_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(jump);
    };
  }, [navigate]);

  const first = (result.patientName ?? "").trim().split(/\s+/)[0];

  return (
    <div
      className="flex min-h-full flex-col bg-gradient-to-b from-brand-100 via-brand-50 to-canvas px-6 pt-16 pb-10 text-center"
      data-testid="pod-reveal"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <span
          className="induction-pop mb-7 flex size-20 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"
          aria-hidden
        >
          <Sparkles size={38} strokeWidth={2} />
        </span>

        <p className="induction-rise text-lg font-semibold text-brand-700">
          {first ? `Thank you, ${first}.` : "All done."}
        </p>
        <h1 className="induction-rise mt-1 text-3xl font-bold text-balance text-brand-900">
          We found your pod
        </h1>

        {result.pod ? (
          <div
            className="induction-rise mt-7 w-full rounded-3xl border border-brand-200 bg-surface p-6 shadow-card"
            data-testid="pod-name"
          >
            <h2 className="text-2xl font-bold text-balance text-ink">{result.pod.name}</h2>
            {result.pod.description && (
              <p className="mt-3 text-base text-balance text-ink-soft">{result.pod.description}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-base font-semibold text-brand-700">
              {result.pod.memberCount !== undefined && (
                <span className="inline-flex items-center gap-1.5">
                  <Users size={19} aria-hidden />
                  {result.pod.memberCount} members
                </span>
              )}
              {result.distanceKm !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={19} aria-hidden />
                  {result.distanceKm} km away
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-7 max-w-[30ch] text-base text-balance text-ink-soft">
            Your profile is saved. We're still forming a group in your area — we'll be in touch
            as soon as there's one for you.
          </p>
        )}
      </div>

      <div className="mt-10 space-y-3">
        <Button size="lg" fullWidth onClick={() => navigate("/home", { replace: true })}>
          Take me in
          <ArrowRight size={22} aria-hidden />
        </Button>
        <p className="text-sm text-ink-faint">Taking you there in {seconds}s…</p>
      </div>
    </div>
  );
}
