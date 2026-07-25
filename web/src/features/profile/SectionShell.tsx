/**
 * The tap-to-edit wrapper every profile section shares: read view with a big
 * Edit control, edit view with Save and Cancel, and forgiving error handling
 * (nothing is lost if a save fails — the draft stays on screen).
 */
import { Pencil, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { updateProfile } from "../../lib/api";
import type { PatientProfile, UpdateProfileBody } from "../../lib/types";

/** Every profile section takes the same two things. */
export interface SectionProps {
  patient: PatientProfile;
  onSaved: (patient: PatientProfile) => void;
}

export interface SectionEditor {
  editing: boolean;
  saving: boolean;
  error: string | null;
  /** Enter edit mode. */
  start: () => void;
  /** Leave edit mode, throwing the draft away. */
  cancel: () => void;
  /** PATCH the given fields, then hand the refreshed profile upstream. */
  save: (body: UpdateProfileBody) => Promise<void>;
}

export function useSectionEditor(
  patientId: string,
  onSaved: (patient: PatientProfile) => void,
  onStart?: () => void,
): SectionEditor {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    setError(null);
    onStart?.();
    setEditing(true);
  }, [onStart]);

  const cancel = useCallback(() => {
    setError(null);
    setEditing(false);
  }, []);

  const save = useCallback(
    async (body: UpdateProfileBody) => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateProfile(patientId, body);
        onSaved(result.patient);
        setEditing(false);
        if (result.warning) setError(result.warning);
      } catch (err) {
        setError(err instanceof Error ? err.message : "We couldn't save that. Try again?");
      } finally {
        setSaving(false);
      }
    },
    [patientId, onSaved],
  );

  return { editing, saving, error, start, cancel, save };
}

interface SectionShellProps {
  title: string;
  icon: ReactNode;
  editor: SectionEditor;
  /** Called when Save is tapped — builds the PATCH body from the draft. */
  onSave: () => void;
  children: ReactNode;
}

export function SectionShell({ title, icon, editor, onSave, children }: SectionShellProps) {
  const { editing, saving, error, start, cancel } = editor;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg text-ink">
          <span className="text-brand-600" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={start}
            className="-mr-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-base font-semibold text-brand-700 hover:bg-brand-50"
          >
            <Pencil size={18} aria-hidden />
            Edit
            <span className="sr-only"> {title}</span>
          </button>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-danger-700">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {editing && (
        <div className="mt-5 flex gap-3 border-t border-line pt-4">
          <Button onClick={onSave} disabled={saving} fullWidth>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={cancel} disabled={saving} fullWidth>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Small key/value row used throughout the read views. */
export function ReadRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="text-sm font-semibold tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-base text-ink">{children}</dd>
    </div>
  );
}

export function NotSet({ children = "Not set yet" }: { children?: ReactNode }) {
  return <span className="text-ink-faint italic">{children}</span>;
}
