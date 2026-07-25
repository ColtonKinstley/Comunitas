/**
 * Conditions, goals, starting fitness and confidence. Notes captured during
 * induction are shown alongside each chip and preserved through edits.
 */
import { HeartPulse } from "lucide-react";
import { useCallback, useState } from "react";
import { Chip, humanizeSlug } from "../../components/Chip";
import type { Tag } from "../../lib/types";
import { FieldLabel, ScaleField, ScaleReadout, TextAreaField, ToggleChip } from "./controls";
import { NotSet, SectionShell, useSectionEditor } from "./SectionShell";
import type { SectionProps } from "./SectionShell";
import { noteMap, slugsOf, toggleTag } from "./tags";
import {
  CONDITION_SLUGS,
  CONFIDENCE_LABELS,
  FITNESS_LABELS,
  GOAL_SLUGS,
  optionsWith,
} from "./vocab";

function TagReadout({ label, tags }: { label: string; tags: Tag[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">{label}</h3>
      {tags.length === 0 ? (
        <p className="mt-1 text-base">
          <NotSet />
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Chip tone="brand">{humanizeSlug(tag.slug)}</Chip>
              {tag.note && <p className="mt-1 text-base text-ink-soft">{tag.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagPicker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((slug) => (
          <ToggleChip
            key={slug}
            selected={selected.includes(slug)}
            onToggle={() => onToggle(slug)}
          >
            {humanizeSlug(slug)}
          </ToggleChip>
        ))}
      </div>
    </div>
  );
}

export function HealthSection({ patient, onSaved }: SectionProps) {
  const [conditions, setConditions] = useState<Tag[]>(patient.conditions);
  const [goals, setGoals] = useState<Tag[]>(patient.goals);
  const [fitnessLevel, setFitnessLevel] = useState<number | null>(patient.fitnessLevel);
  const [fitnessNotes, setFitnessNotes] = useState(patient.fitnessNotes ?? "");
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(patient.confidenceLevel);

  const resetDraft = useCallback(() => {
    setConditions(patient.conditions);
    setGoals(patient.goals);
    setFitnessLevel(patient.fitnessLevel);
    setFitnessNotes(patient.fitnessNotes ?? "");
    setConfidenceLevel(patient.confidenceLevel);
  }, [
    patient.conditions,
    patient.goals,
    patient.fitnessLevel,
    patient.fitnessNotes,
    patient.confidenceLevel,
  ]);

  const editor = useSectionEditor(patient.id, onSaved, resetDraft);

  const conditionNotes = noteMap(patient.conditions);
  const goalNotes = noteMap(patient.goals);

  return (
    <SectionShell
      title="Health & goals"
      icon={<HeartPulse size={22} />}
      editor={editor}
      onSave={() =>
        void editor.save({
          conditions,
          goals,
          fitnessLevel,
          fitnessNotes: fitnessNotes.trim() || null,
          confidenceLevel,
        })
      }
    >
      {editor.editing ? (
        <div className="space-y-6">
          <TagPicker
            label="What you're managing"
            options={optionsWith(CONDITION_SLUGS, slugsOf(patient.conditions))}
            selected={slugsOf(conditions)}
            onToggle={(slug) =>
              setConditions((current) => toggleTag(current, slug, conditionNotes))
            }
          />
          <TagPicker
            label="What you'd like to get out of this"
            options={optionsWith(GOAL_SLUGS, slugsOf(patient.goals))}
            selected={slugsOf(goals)}
            onToggle={(slug) => setGoals((current) => toggleTag(current, slug, goalNotes))}
          />
          <ScaleField
            label="How active you are right now"
            value={fitnessLevel}
            labels={FITNESS_LABELS}
            onChange={setFitnessLevel}
          />
          <TextAreaField
            id="profile-fitness-notes"
            label="Anything else about how you're moving?"
            value={fitnessNotes}
            onChange={setFitnessNotes}
            placeholder="e.g. I walk to the shops most days."
          />
          <ScaleField
            label="How you feel about joining a group"
            value={confidenceLevel}
            labels={CONFIDENCE_LABELS}
            onChange={setConfidenceLevel}
          />
          <p className="text-sm text-ink-faint">
            Your notes from the interview are kept — ticking a box off and on again won't lose
            them.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <TagReadout label="What you're managing" tags={patient.conditions} />
          <TagReadout label="Your goals" tags={patient.goals} />
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">
              How active you are
            </h3>
            <div className="mt-2">
              <ScaleReadout value={patient.fitnessLevel} labels={FITNESS_LABELS} />
            </div>
            {patient.fitnessNotes && (
              <p className="mt-2 text-base text-ink-soft">{patient.fitnessNotes}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-ink-faint uppercase">
              Joining a group
            </h3>
            <div className="mt-2">
              <ScaleReadout value={patient.confidenceLevel} labels={CONFIDENCE_LABELS} />
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}
