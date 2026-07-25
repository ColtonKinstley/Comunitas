import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Shows a large back control on the left. */
  back?: boolean;
  /** Rendered on the right of the title row — a chip or icon button. */
  action?: ReactNode;
}

/** Sticky title bar for every screen inside the phone frame. */
export function PageHeader({ title, subtitle, back = false, action }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 border-b border-line/70 bg-canvas/95 px-5 pt-6 pb-4 backdrop-blur-sm">
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl pr-3 pl-1 text-base font-semibold text-brand-700 hover:bg-brand-50"
        >
          <ChevronLeft size={22} aria-hidden />
          Back
        </button>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl text-ink">{title}</h1>
        {action}
      </div>
      {subtitle && <p className="mt-1 text-base text-ink-soft">{subtitle}</p>}
    </header>
  );
}
