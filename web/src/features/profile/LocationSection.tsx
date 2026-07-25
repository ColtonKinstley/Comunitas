/**
 * Geography first — this is the matcher's strongest signal. Postcode, how far
 * you'll travel, how you get around, and anything that makes moving harder.
 */
import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import { Chip } from "../../components/Chip";
import type { TransportMode } from "../../lib/types";
import { FieldLabel, Stepper, TextAreaField, TextField, ToggleChip } from "./controls";
import { NotSet, ReadRow, SectionShell, useSectionEditor } from "./SectionShell";
import type { SectionProps } from "./SectionShell";
import { TRANSPORT_MODES } from "./vocab";

const modeLabel = (slug: string) =>
  TRANSPORT_MODES.find((mode) => mode.slug === slug)?.label ?? slug;

export function LocationSection({ patient, onSaved }: SectionProps) {
  const [postcode, setPostcode] = useState(patient.postcode ?? "");
  const [radius, setRadius] = useState(patient.travelRadiusKm);
  const [modes, setModes] = useState<TransportMode[]>(patient.transportModes);
  const [mobilityNotes, setMobilityNotes] = useState(patient.mobilityNotes ?? "");

  const resetDraft = useCallback(() => {
    setPostcode(patient.postcode ?? "");
    setRadius(patient.travelRadiusKm);
    setModes(patient.transportModes);
    setMobilityNotes(patient.mobilityNotes ?? "");
  }, [patient.postcode, patient.travelRadiusKm, patient.transportModes, patient.mobilityNotes]);

  const editor = useSectionEditor(patient.id, onSaved, resetDraft);

  const toggleMode = (mode: TransportMode) =>
    setModes((current) =>
      current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode],
    );

  return (
    <SectionShell
      title="Location & travel"
      icon={<MapPin size={22} />}
      editor={editor}
      onSave={() =>
        void editor.save({
          postcode: postcode.trim() || null,
          travelRadiusKm: radius,
          transportModes: modes,
          mobilityNotes: mobilityNotes.trim() || null,
        })
      }
    >
      {editor.editing ? (
        <div className="space-y-5">
          <TextField
            id="profile-postcode"
            label="Your postcode"
            value={postcode}
            onChange={setPostcode}
            placeholder="e.g. E9 6HB"
            hint="We only use this to find groups near you."
          />
          <Stepper
            label="How far you'll travel"
            value={radius}
            min={1}
            max={20}
            unit="km"
            onChange={setRadius}
          />
          <div>
            <FieldLabel>How you get around</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_MODES.map(({ slug, label }) => (
                <ToggleChip
                  key={slug}
                  selected={modes.includes(slug)}
                  onToggle={() => toggleMode(slug)}
                >
                  {label}
                </ToggleChip>
              ))}
            </div>
          </div>
          <TextAreaField
            id="profile-mobility"
            label="Anything that makes getting about harder?"
            value={mobilityNotes}
            onChange={setMobilityNotes}
            placeholder="e.g. I need to stop and sit down every 20 minutes."
          />
        </div>
      ) : (
        <dl>
          <ReadRow label="Postcode">{patient.postcode ?? <NotSet />}</ReadRow>
          <ReadRow label="Willing to travel">
            {patient.travelRadiusKm} km from home
          </ReadRow>
          <ReadRow label="How you get around">
            {patient.transportModes.length === 0 ? (
              <NotSet />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {patient.transportModes.map((mode) => (
                  <li key={mode}>
                    <Chip tone="brand">{modeLabel(mode)}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </ReadRow>
          {patient.mobilityNotes && (
            <ReadRow label="Getting about">{patient.mobilityNotes}</ReadRow>
          )}
        </dl>
      )}
    </SectionShell>
  );
}
