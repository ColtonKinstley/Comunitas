import { ArrowRight, LoaderCircle, LogIn, Mic, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, LinkButton } from "../components/Button";
import { claimPatient, getDemo, getMe } from "../lib/api";
import { authClient } from "../lib/auth";
import { getCurrentPatientId, setCurrentPatientId } from "../lib/patient";

// lucide-react dropped brand icons, so the GitHub mark is inlined.
function GithubMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.04 11.04 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/**
 * The brand moment. Two ways in: start a fresh voice induction, or step
 * straight into the seeded demo patient's fully-populated account.
 */
export default function Welcome() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolves an existing auth session (e.g. landing back here after an OAuth
  // redirect, or just reopening the app signed in) to the right screen.
  // Never redirects a signed-out visitor — the welcome screen renders as normal.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (!me.user) return; // signed out — normal welcome screen
        if (me.patientId) {
          setCurrentPatientId(me.patientId);
          navigate("/home", { replace: true });
          return;
        }
        // Signed in but no patient yet: adopt a pre-auth localStorage patient, else induct.
        const localId = getCurrentPatientId();
        if (localId) {
          const claimed = await claimPatient(localId).catch(() => null);
          if (cancelled) return;
          if (claimed?.patientId) {
            setCurrentPatientId(claimed.patientId);
            navigate("/home", { replace: true });
            return;
          }
        }
        navigate("/induction", { replace: true });
      } catch {
        // API down — welcome screen already handles that via the demo button's error path.
      }
    })();

    // Welcome unmounts as soon as the user navigates away (tapping "Start
    // your induction" or the demo button); without this guard a slow /api/me
    // or /api/me/claim response could resolve afterwards and hijack that
    // navigation with a stale redirect.
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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

  async function continueWithProvider(provider: "google" | "github") {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    setError(null);
    const notConfigured = `${provider === "google" ? "Google" : "GitHub"} sign-in isn't configured. Set ${provider.toUpperCase()}_CLIENT_ID in .env (see README).`;
    try {
      // better-auth client methods resolve `{ data, error }` rather than
      // throwing on API/HTTP failure — the try/catch below only covers
      // network-level rejections, the `error` check is what actually fires
      // when e.g. no client id is configured for the provider.
      const { error: signInError } = await authClient.signIn.social({
        provider,
        // Back to the app's welcome screen, not the static landing page at "/".
        callbackURL: "/welcome",
      });
      if (signInError) {
        // A 5xx is a server-side failure (bad DB schema, missing tables) —
        // telling the user to "set CLIENT_ID" there sends them down the wrong
        // road entirely.
        setError(
          (signInError.status ?? 0) >= 500
            ? "Sign-in failed on the server. Check the API logs — usually the database schema is behind the deployed code."
            : notConfigured,
        );
        setLoadingProvider(null);
      }
      // On success the browser redirects to the provider, so this component
      // unmounts — no need to reset the flag on that path.
    } catch {
      setError(notConfigured);
      setLoadingProvider(null);
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
          onClick={() => continueWithProvider("google")}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === "google" ? (
            <LoaderCircle size={22} className="animate-spin" aria-hidden />
          ) : (
            <LogIn size={22} aria-hidden />
          )}
          {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => continueWithProvider("github")}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === "github" ? (
            <LoaderCircle size={22} className="animate-spin" aria-hidden />
          ) : (
            <GithubMark size={22} />
          )}
          {loadingProvider === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>

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
