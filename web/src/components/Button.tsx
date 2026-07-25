import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary: "bg-surface text-brand-800 border-2 border-brand-200 hover:border-brand-300 hover:bg-brand-50",
  ghost: "bg-transparent text-ink-soft hover:bg-brand-50 hover:text-brand-800",
  danger: "bg-danger-100 text-danger-700 border-2 border-transparent hover:bg-danger-100/80",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-[44px] px-4 text-base",
  lg: "min-h-[56px] px-6 text-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
  className = "",
) {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

/** Same look as `Button`, but navigates. */
export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
}: LinkButtonProps) {
  return (
    <Link to={to} className={buttonClasses(variant, size, fullWidth, className)}>
      {children}
    </Link>
  );
}
