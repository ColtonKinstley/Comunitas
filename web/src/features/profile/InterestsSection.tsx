/** What you actually enjoy — the difference between turning up and not. */
import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Chip, humanizeSlug } from "../../components/Chip";
import type { Tag } from "../../lib/types";
import { ToggleChip } from "./controls";
import { NotSet, SectionShell, useSectionEditor } from "./SectionShell";
import type { SectionProps } from "./SectionShell";
import { noteMap, slugsOf, toggleTag } from "./tags";
import { INTEREST_SLUGS, optionsWith } from "./vocab";

export function InterestsSection({ patient, onSaved }: SectionProps) {
  const [interests, setInterests] = useState<Tag[]>(patient.interests);

  const resetDraft = useCallback(() => setInterests(patient.interests), [patient.interests]);
  const editor = useSectionEditor(patient.id, onSaved, resetDraft);

  const notes = noteMap(patient.interests);
  const selected = slugsOf(interests);

  return (
    <SectionShell
      title="Things you enjoy"
      icon={<Sparkles size={22} />}
      editor={editor}
      onSave={() => void editor.save({ interests })}
    >
      {editor.editing ? (
        <>
          <p className="mb-3 text-base text-ink-soft">Tap anything that appeals.</p>
          <div className="flex flex-wrap gap-2">
            {optionsWith(INTEREST_SLUGS, slugsOf(patient.interests)).map((slug) => (
              <ToggleChip
                key={slug}
                selected={selected.includes(slug)}
                onToggle={() => setInterests((current) => toggleTag(current, slug, notes))}
              >
                {humanizeSlug(slug)}
              </ToggleChip>
            ))}
          </div>
        </>
      ) : patient.interests.length === 0 ? (
        <p className="text-base">
          <NotSet>Nothing added yet — tap Edit to tell us what you like.</NotSet>
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {patient.interests.map((interest) => (
            <li key={interest.slug}>
              <Chip tone="brand">{humanizeSlug(interest.slug)}</Chip>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
