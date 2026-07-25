/**
 * The money shot: a profile that visibly assembles itself while the person
 * talks. Every section is rendered from the first frame — greyed out and
 * waiting — so you can watch it fill in rather than watch it appear.
 */
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Chip, humanizeSlug } from "../../components/Chip";
import type { DayKey, Tag, TimeSlot } from "../../lib/types";
import type { ProfileState } from "./types";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

const SLOTS: { key: TimeSlot; label: string }[] = [
  { key: "morning", label: "AM" },
  { key: "afternoon", label: "PM" },
  { key: "evening", label: "Eve" },
];

const TRANSPORT_LABELS: Record<string, string> = {
  walk: "On foot",
  cycle: "Bike",
  bus: "Bus",
  tube: "Tube",
  car: "Car",
};

interface RowProps {
  label: string;
  /** Bumped by the hook whenever this group changes — re-keys the animation. */
  version: number;
  filled: boolean;
  children: ReactNode;
}

function Row({ label, version, filled, children }: RowProps) {
  return (
    <div className="border-t border-line/70 px-5 py-3.5 first:border-t-0">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-ink-faint uppercase">{label}</h3>
        {filled && (
          <span
            key={`tick-${version}`}
            className="induction-pop flex size-4 items-center justify-center rounded-full bg-brand-500 text-white"
            aria-hidden
          >
            <Check size={11} strokeWidth={3.5} />
          </span>
        )}
      </div>
      <div key={`${label}-${version}`} className={filled ? "induction-rise mt-1.5" : "mt-1.5"}>
        {children}
      </div>
    </div>
  );
}

const Waiting = ({ children = "Not yet" }: { children?: ReactNode }) => (
  <p className="text-base text-ink-faint/80 italic">{children}</p>
);

function TagChips({ tags, tone }: { tags: Tag[]; tone: "brand" | "accent" | "neutral" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Chip key={t.slug} tone={tone}>
          {humanizeSlug(t.slug)}
        </Chip>
      ))}
    </div>
  );
}

function Meter({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="img" aria-label={`${label}: ${value} out of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={[
              "h-3 w-7 rounded-full transition-colors duration-500",
              i < value ? "bg-brand-500" : "bg-line",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-base font-semibold text-ink">
        {value}
        <span className="text-ink-faint">/{max}</span>
      </span>
    </div>
  );
}

export function LiveProfileCard({ profile }: { profile: ProfileState }) {
  const { draft, versions } = profile;
  const v = (key: string) => versions[key] ?? 0;

  const conditions = draft.conditions ?? [];
  const goals = draft.goals ?? [];
  const interests = draft.interests ?? [];
  const availability = draft.availability ?? {};
  const availableDays = DAYS.filter((d) => (availability[d.key] ?? []).length > 0).length;

  const hasLocation = Boolean(draft.postcode);
  const hasTravel = draft.travelRadiusKm !== undefined || (draft.transportModes ?? []).length > 0;
  const hasFitness = typeof draft.fitnessLevel === "number";
  const hasConstraints = Boolean(draft.mobilityNotes) || typeof draft.confidenceLevel === "number";

  const done = [
    hasLocation,
    conditions.length > 0,
    goals.length > 0,
    hasFitness,
    interests.length > 0,
    availableDays > 0,
    hasConstraints,
  ].filter(Boolean).length;
  const total = 7;

  return (
    <section
      aria-label="Your profile so far"
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
      data-testid="live-profile"
    >
      {/* Header + progress */}
      <div className="bg-brand-50/70 px-5 pt-4 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-900">Your profile so far</h2>
          <span className="text-sm font-semibold text-brand-700" data-testid="profile-progress">
            {done} of {total}
          </span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-brand-200/70">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <p key={`name-${v("name")}`} className="induction-rise mt-3 text-2xl font-bold text-ink">
          {draft.name ?? <span className="text-ink-faint/80 italic">Waiting for a name…</span>}
        </p>
      </div>

      <Row label="Where you are" version={v("location")} filled={hasLocation}>
        {hasLocation ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="profile-postcode">
            <Chip tone="brand">{draft.postcode}</Chip>
            {typeof draft.lat === "number" && typeof draft.lng === "number" && (
              <span className="text-sm text-ink-faint">Located ✓</span>
            )}
          </div>
        ) : (
          <Waiting>Your area</Waiting>
        )}
      </Row>

      <Row label="Getting there" version={v("travel")} filled={hasTravel}>
        {hasTravel ? (
          <div className="flex flex-wrap items-center gap-2">
            {draft.travelRadiusKm !== undefined && (
              <Chip tone="neutral">Up to {draft.travelRadiusKm} km</Chip>
            )}
            {(draft.transportModes ?? []).map((m) => (
              <Chip key={m} tone="neutral">
                {TRANSPORT_LABELS[m] ?? m}
              </Chip>
            ))}
          </div>
        ) : (
          <Waiting>How far, and how you travel</Waiting>
        )}
      </Row>

      <Row label="Health" version={v("conditions")} filled={conditions.length > 0}>
        {conditions.length > 0 ? (
          <TagChips tags={conditions} tone="accent" />
        ) : (
          <Waiting>What brought you here</Waiting>
        )}
      </Row>

      <Row label="Goals" version={v("goals")} filled={goals.length > 0}>
        {goals.length > 0 ? (
          <TagChips tags={goals} tone="brand" />
        ) : (
          <Waiting>What you'd like to change</Waiting>
        )}
      </Row>

      <Row label="Activity level" version={v("fitness")} filled={hasFitness}>
        {hasFitness ? (
          <div className="space-y-1.5">
            <Meter value={draft.fitnessLevel ?? 0} label="Fitness" />
            {draft.fitnessNotes && <p className="text-base text-ink-soft">{draft.fitnessNotes}</p>}
          </div>
        ) : (
          <Waiting>How active you are now</Waiting>
        )}
      </Row>

      <Row label="Interests" version={v("interests")} filled={interests.length > 0}>
        {interests.length > 0 ? (
          <TagChips tags={interests} tone="brand" />
        ) : (
          <Waiting>What you enjoy</Waiting>
        )}
      </Row>

      <Row label="When you're free" version={v("availability")} filled={availableDays > 0}>
        {availableDays > 0 ? (
          <div className="space-y-1" data-testid="profile-availability">
            <div className="grid grid-cols-[2.6rem_repeat(7,1fr)] gap-1">
              <span />
              {DAYS.map((d, i) => (
                <span
                  key={`${d.key}-${i}`}
                  className="text-center text-xs font-semibold text-ink-faint"
                >
                  {d.label}
                </span>
              ))}
            </div>
            {SLOTS.map((slot) => (
              <div key={slot.key} className="grid grid-cols-[2.6rem_repeat(7,1fr)] items-center gap-1">
                <span className="text-xs font-semibold text-ink-faint">{slot.label}</span>
                {DAYS.map((d, i) => {
                  const on = (availability[d.key] ?? []).includes(slot.key);
                  return (
                    <span
                      key={`${d.key}-${i}`}
                      className={[
                        "h-6 rounded-md transition-colors duration-500",
                        on ? "bg-brand-500" : "bg-canvas",
                      ].join(" ")}
                      title={on ? `${d.key} ${slot.key}` : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <Waiting>Your week</Waiting>
        )}
      </Row>

      <Row label="Getting about" version={v("constraints")} filled={hasConstraints}>
        {hasConstraints ? (
          <div className="space-y-2">
            {draft.mobilityNotes && <p className="text-base text-ink-soft">{draft.mobilityNotes}</p>}
            {typeof draft.confidenceLevel === "number" && (
              <div>
                <p className="mb-1 text-sm text-ink-faint">Confidence about joining</p>
                <Meter value={draft.confidenceLevel} label="Confidence" />
              </div>
            )}
          </div>
        ) : (
          <Waiting>Anything we should know</Waiting>
        )}
      </Row>
    </section>
  );
}
