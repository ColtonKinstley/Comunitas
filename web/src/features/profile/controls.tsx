/**
 * Editing controls sized for the audience: nothing under 44px, everything
 * labelled in words, no free-typing where a tap will do.
 */
import { Check, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

interface ToggleChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Chip-shaped control. `Chip` itself is display-only, so this is its twin. */
export function ToggleChip({ selected, onToggle, children }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4",
        "text-base font-semibold transition-colors",
        selected
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:bg-brand-50",
      ].join(" ")}
    >
      {selected && <Check size={17} strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-base font-semibold text-ink">
      {children}
    </label>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  autoCapitalize?: string;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  autoCapitalize,
}: TextFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[48px] w-full rounded-2xl border-2 border-line bg-surface px-4 text-base text-ink placeholder:text-ink-faint focus:border-brand-400 focus:outline-none"
      />
      {hint && <p className="mt-1 text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border-2 border-line bg-surface p-3 text-base text-ink placeholder:text-ink-faint focus:border-brand-400 focus:outline-none"
      />
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, step = 1, unit, onChange }: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const buttonClass =
    "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-surface text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40";

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className={buttonClass}
        >
          <Minus size={22} strokeWidth={2.5} aria-hidden />
        </button>
        <output className="min-w-[6rem] text-center text-xl font-bold text-ink">
          {value} {unit}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className={buttonClass}
        >
          <Plus size={22} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}

interface ScaleFieldProps {
  label: string;
  value: number | null;
  labels: Record<number, string>;
  onChange: (value: number) => void;
}

/** A 1–5 scale that always shows the words, not just the number. */
export function ScaleField({ label, value, labels, onChange }: ScaleFieldProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((level) => {
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              aria-label={`${level} — ${labels[level] ?? ""}`}
              onClick={() => onChange(level)}
              className={[
                "min-h-[48px] flex-1 rounded-2xl border-2 text-lg font-bold transition-colors",
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line bg-surface text-ink-soft hover:border-brand-300 hover:bg-brand-50",
              ].join(" ")}
            >
              {level}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-base text-ink-soft">
        {value === null ? "Not set yet" : (labels[value] ?? "")}
      </p>
    </div>
  );
}

/** Read-mode version of the 1–5 scale: filled pips plus the label. */
export function ScaleReadout({
  value,
  labels,
}: {
  value: number | null;
  labels: Record<number, string>;
}) {
  if (value === null) return <p className="text-base text-ink-faint">Not set yet</p>;
  return (
    <div>
      <p className="text-base font-semibold text-ink">
        {labels[value] ?? ""} <span className="font-normal text-ink-faint">({value} of 5)</span>
      </p>
      <span className="mt-1.5 flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={[
              "h-2.5 flex-1 rounded-full",
              level <= value ? "bg-brand-500" : "bg-line",
            ].join(" ")}
          />
        ))}
      </span>
    </div>
  );
}
