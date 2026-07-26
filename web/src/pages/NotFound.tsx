/**
 * The friendly dead end. Any unknown URL, and any error React Router would
 * otherwise render as a stack trace, lands here — branded, inside the phone
 * frame, with one obvious way back.
 */
import { Compass } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { LinkButton } from "../components/Button";
import { PhoneFrame } from "../components/PhoneFrame";

interface LostProps {
  title: string;
  message: string;
}

function Lost({ title, message }: LostProps) {
  return (
    <div
      className="flex min-h-full flex-col px-6 pt-16 pb-10 text-center"
      data-testid="not-found"
    >
      <div className="flex flex-1 flex-col items-center">
        <span
          className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-brand-100 text-brand-700"
          aria-hidden
        >
          <Compass size={32} />
        </span>
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Comunitas</p>
        <h1 className="mt-2 text-3xl font-bold text-balance text-brand-900">{title}</h1>
        <p className="mt-4 max-w-[30ch] text-lg text-balance text-ink-soft">{message}</p>
      </div>

      <div className="mt-8 space-y-3">
        <LinkButton to="/home" size="lg" fullWidth>
          Take me home
        </LinkButton>
        <LinkButton to="/welcome" variant="ghost" size="md" fullWidth>
          Back to the start
        </LinkButton>
      </div>
    </div>
  );
}

/** Catch-all route: an address that simply isn't part of the app. */
export default function NotFound() {
  return (
    <Lost
      title="We can't find that page"
      message="That address isn't part of Comunitas. Nothing's broken — let's get you back to your week."
    />
  );
}

/**
 * Route `errorElement`. It replaces the whole root route, layout included, so
 * it brings its own phone frame.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;

  if (!missing) console.error("[router]", error);

  return (
    <PhoneFrame>
      <Lost
        title={missing ? "We can't find that page" : "Something went wrong"}
        message={
          missing
            ? "That address isn't part of Comunitas. Nothing's broken — let's get you back to your week."
            : "Sorry — that didn't load properly. Going home usually sorts it out."
        }
      />
    </PhoneFrame>
  );
}
