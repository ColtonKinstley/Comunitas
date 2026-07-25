/** Name and age band — the two things every other screen greets you with. */
import { UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { Chip } from "../../components/Chip";
import type { AgeBand } from "../../lib/types";
import { ToggleChip, FieldLabel, TextField } from "./controls";
import { NotSet, ReadRow, SectionShell, useSectionEditor } from "./SectionShell";
import type { SectionProps } from "./SectionShell";
import { AGE_BANDS } from "./vocab";

export function AboutSection({ patient, onSaved }: SectionProps) {
  const [name, setName] = useState(patient.name ?? "");
  const [ageBand, setAgeBand] = useState<AgeBand | null>(patient.ageBand);

  const resetDraft = useCallback(() => {
    setName(patient.name ?? "");
    setAgeBand(patient.ageBand);
  }, [patient.name, patient.ageBand]);

  const editor = useSectionEditor(patient.id, onSaved, resetDraft);

  return (
    <SectionShell
      title="About you"
      icon={<UserRound size={22} />}
      editor={editor}
      onSave={() =>
        void editor.save({ name: name.trim() || null, ageBand })
      }
    >
      {editor.editing ? (
        <div className="space-y-5">
          <TextField
            id="profile-name"
            label="Your name"
            value={name}
            onChange={setName}
            placeholder="e.g. Priya Shah"
            autoCapitalize="words"
          />
          <div>
            <FieldLabel>Your age</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {AGE_BANDS.map((band) => (
                <ToggleChip
                  key={band}
                  selected={ageBand === band}
                  onToggle={() => setAgeBand(ageBand === band ? null : band)}
                >
                  {band}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <dl>
          <ReadRow label="Name">{patient.name ?? <NotSet />}</ReadRow>
          <ReadRow label="Age">
            {patient.ageBand ? <Chip tone="neutral">{patient.ageBand}</Chip> : <NotSet />}
          </ReadRow>
        </dl>
      )}
    </SectionShell>
  );
}
