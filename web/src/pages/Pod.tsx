import { Users } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useCurrentPatient } from "../lib/patient";

/** Placeholder. Will show pod name, description, members, shared interests, map thumb. */
export default function Pod() {
  const patientId = useCurrentPatient();

  return (
    <div className="pb-8">
      <PageHeader title="Your pod" subtitle="The people you'll be moving with" back />
      <div className="px-5 pt-5">
        <EmptyState
          icon={<Users size={28} />}
          title="Coming soon"
          message={
            patientId
              ? "Your pod's members and what you have in common will appear here."
              : "Loading your account…"
          }
        />
      </div>
    </div>
  );
}
