import { Mic } from "lucide-react";
import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

/**
 * Placeholder. Owned by the voice work stream: mic permission → WebRTC connect
 * → live captions + profile card → pod reveal → /home.
 */
export default function Induction() {
  return (
    <div className="flex min-h-full flex-col px-5 pt-10 pb-8">
      <h1 className="text-2xl text-ink">Your induction</h1>
      <p className="mt-1 text-base text-ink-soft">
        A short spoken conversation — no forms to fill in.
      </p>

      <div className="mt-8 flex-1">
        <EmptyState
          icon={<Mic size={28} />}
          title="Coming soon"
          message="The voice interview will live here."
        />
      </div>

      <LinkButton to="/" variant="ghost" size="lg" fullWidth className="mt-6">
        Back to start
      </LinkButton>
    </div>
  );
}
