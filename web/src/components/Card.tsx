import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Removes the default padding when you need edge-to-edge content. */
  flush?: boolean;
}

const BASE = "rounded-2xl border border-line bg-surface shadow-card";

export function Card({ children, flush = false, className = "", ...rest }: CardProps) {
  return (
    <div className={[BASE, flush ? "" : "p-5", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

interface LinkCardProps {
  to: string;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}

/** A whole card as one large tap target. */
export function LinkCard({ to, children, flush = false, className = "" }: LinkCardProps) {
  return (
    <Link
      to={to}
      className={[
        BASE,
        flush ? "" : "p-5",
        "block transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

/** Small all-caps label for grouping cards into sections. */
export function CardSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-ink-faint uppercase">
      {children}
    </h2>
  );
}
