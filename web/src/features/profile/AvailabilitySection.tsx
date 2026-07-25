/** When you're free. Tap the squares in edit mode; they toggle one at a time. */
import { CalendarDays } from "lucide-react";
import { useCallback, useState } from "react";
import type { Availability, DayKey, TimeSlot } from "../../lib/types";
import { AvailabilityGrid, countSlots, toggleSlot } from "./AvailabilityGrid";
import { SectionShell, useSectionEditor } from "./SectionShell";
import type { SectionProps } from "./SectionShell";

export function AvailabilitySection({ patient, onSaved }: SectionProps) {
  const [availability, setAvailability] = useState<Availability>(patient.availability);

  const resetDraft = useCallback(
    () => setAvailability(patient.availability),
    [patient.availability],
  );
  const editor = useSectionEditor(patient.id, onSaved, resetDraft);

  const shown = editor.editing ? availability : patient.availability;
  const total = countSlots(shown);

  const onToggle = (day: DayKey, slot: TimeSlot) =>
    setAvailability((current) => toggleSlot(current, day, slot));

  return (
    <SectionShell
      title="When you're free"
      icon={<CalendarDays size={22} />}
      editor={editor}
      onSave={() => void editor.save({ availability })}
    >
      <p className="mb-3 text-base text-ink-soft">
        {editor.editing
          ? "Tap the times you could usually make."
          : total === 0
            ? "You haven't told us when you're free yet."
            : `${total} ${total === 1 ? "time" : "times"} a week you could usually make.`}
      </p>
      <AvailabilityGrid
        availability={shown}
        editing={editor.editing}
        onToggle={editor.editing ? onToggle : undefined}
      />
    </SectionShell>
  );
}
