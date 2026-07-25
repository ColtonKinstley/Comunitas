import type { ReactNode } from "react";

export type ChipTone = "neutral" | "brand" | "accent" | "success" | "danger" | "muted";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-canvas text-ink-soft border-line",
  brand: "bg-brand-50 text-brand-800 border-brand-200",
  accent: "bg-accent-50 text-accent-700 border-accent-200",
  success: "bg-brand-100 text-brand-800 border-brand-300",
  danger: "bg-danger-100 text-danger-700 border-danger-100",
  muted: "bg-canvas text-ink-faint border-transparent",
};

interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  className?: string;
}

/** Small status/label pill. Never a control — use `Button` for anything tappable. */
export function Chip({ children, tone = "neutral", icon, className = "" }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}

/** Turns `type2_diabetes` into `Type 2 diabetes` for display. */
export function humanizeSlug(slug: string): string {
  const spaced = slug.replace(/_/g, " ").replace(/\btype(\d)\b/i, "type $1");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
