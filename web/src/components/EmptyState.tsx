import type { ReactNode } from "react";

interface EmptyStateProps {
  /** A lucide icon element, e.g. `<CalendarDays size={28} />`. */
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}

/** Friendly nothing-here state. Used for placeholders and genuinely empty lists. */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {icon && (
        <span
          className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"
          aria-hidden
        >
          {icon}
        </span>
      )}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {message && <p className="mt-2 max-w-[28ch] text-base text-ink-soft">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
