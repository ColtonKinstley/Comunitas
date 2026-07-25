/**
 * Who's in the pod. First names and interests only — the API never sends
 * anybody else's health data, and this screen never asks for it.
 */
import { Card } from "../../components/Card";
import { Chip, humanizeSlug } from "../../components/Chip";
import type { PodMember } from "../../lib/types";

interface MemberListProps {
  members: PodMember[];
  currentPatientId: string;
  /** Interest slugs two or more members share — highlighted on each row. */
  sharedInterests: string[];
}

/** A soft, stable colour per member so the list reads as people, not rows. */
const AVATAR_TONES = [
  "bg-brand-100 text-brand-800",
  "bg-accent-100 text-accent-700",
  "bg-brand-200 text-brand-800",
  "bg-canvas text-ink-soft",
];

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function MemberList({ members, currentPatientId, sharedInterests }: MemberListProps) {
  const shared = new Set(sharedInterests);
  // You first — it makes the group feel like yours.
  const ordered = [...members].sort((a, b) => {
    if (a.patientId === currentPatientId) return -1;
    if (b.patientId === currentPatientId) return 1;
    return a.firstName.localeCompare(b.firstName);
  });

  return (
    <Card flush>
      <ul className="divide-y divide-line">
        {ordered.map((member, index) => {
          const isYou = member.patientId === currentPatientId;
          return (
            <li key={member.patientId} className="flex items-start gap-3 p-4">
              <span
                className={[
                  "flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                  AVATAR_TONES[index % AVATAR_TONES.length] ?? AVATAR_TONES[0] ?? "",
                ].join(" ")}
                aria-hidden
              >
                {initial(member.firstName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink">
                  {member.firstName}
                  {isYou && <span className="ml-2 text-base font-normal text-ink-faint">(you)</span>}
                </p>
                {member.interests.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {member.interests.map((interest) => (
                      <li key={interest}>
                        <Chip tone={shared.has(interest) ? "brand" : "neutral"}>
                          {humanizeSlug(interest)}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
