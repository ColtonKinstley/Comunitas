import { ArrowRight, LoaderCircle, Mic, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, LinkButton } from "../components/Button";
import { getDemo } from "../lib/api";
import { setCurrentPatientId } from "../lib/patient";

/**
 * The brand moment. Two ways in: start a fresh voice induction, or step
 * straight into the seeded demo patient's fully-populated account.
 */
export default function Welcome() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueAsDemo() {
    setLoadingDemo(true);
    setError(null);
    try {
      const { patientId } = await getDemo();
      setCurrentPatientId(patientId);
      navigate("/home");
    } catch {
      setError("Couldn't load the demo patient. Check the API is running and the database is seeded.");
      setLoadingDemo(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-brand-50 via-canvas to-canvas px-6 pt-16 pb-10">
      {/* Brand */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-7 flex size-20 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"
          aria-hidden
        >
          <Sparkles size={38} strokeWidth={2} />
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-brand-900">Comunitas</h1>

        <p className="mt-4 text-xl font-semibold text-balance text-brand-700">
          Prescription in, community out
        </p>

        <p className="mt-5 max-w-[30ch] text-base text-balance text-ink-soft">
          Tell us about yourself in your own words. We'll find you a small local group with the
          same goals — and the activities to go with it.
        </p>
      </div>

      {/* Ways in */}
      <div className="mt-10 space-y-3">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-danger-100 bg-danger-100 px-4 py-3 text-base text-danger-700"
          >
            {error}
          </p>
        )}

        <LinkButton to="/induction" size="lg" fullWidth>
          <Mic size={22} aria-hidden />
          Start your induction
        </LinkButton>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={continueAsDemo}
          disabled={loadingDemo}
        >
          {loadingDemo ? (
            <LoaderCircle size={22} className="animate-spin" aria-hidden />
          ) : (
            <ArrowRight size={22} aria-hidden />
          )}
          {loadingDemo ? "Loading…" : "Continue as Priya (demo)"}
        </Button>

        <p className="pt-2 text-center text-sm text-ink-faint">
          No account needed. Takes about five minutes.
        </p>
      </div>
    </div>
  );
}
