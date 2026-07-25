/** A one-tap reminder that there are real people waiting for you. */
import { ChevronRight, Users } from "lucide-react";
import { LinkCard } from "../../components/Card";
import type { PodDetail, PodSummary } from "../../lib/types";

interface PodSnapshotCardProps {
  pod: PodSummary;
  /** Full pod when loaded — gives us member first names. */
  detail: PodDetail | null;
  /** Excluded from the "with …" line. */
  currentPatientId: string;
}

/** "Doreen, Marcus and Aisha" — Oxford-comma-free, reads aloud well. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  const last = names[names.length - 1] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}

export function PodSnapshotCard({ pod, detail, currentPatientId }: PodSnapshotCardProps) {
  const others = (detail?.members ?? [])
    .filter((member) => member.patientId !== currentPatientId)
    .map((member) => member.firstName);
  const memberCount = detail?.memberCount ?? pod.memberCount ?? others.length + 1;

  return (
    <LinkCard to="/pod">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wide text-ink-faint uppercase">Your pod</p>
          <h2 className="mt-1 text-xl text-ink">{pod.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-base text-ink-soft">
            <Users size={18} className="shrink-0 text-ink-faint" aria-hidden />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
          {others.length > 0 && (
            <p className="mt-1 text-base text-ink-soft">
              With{" "}
              {others.length > 3
                ? `${others.slice(0, 3).join(", ")} and ${others.length - 3} more`
                : joinNames(others)}
            </p>
          )}
        </div>
        <ChevronRight size={26} className="mt-6 shrink-0 text-brand-600" aria-hidden />
      </div>
    </LinkCard>
  );
}
