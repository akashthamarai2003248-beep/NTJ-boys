"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "navy" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-saffron-600 text-white hover:bg-saffron-700 shadow-[0_1px_0_rgba(0,0,0,0.08)] focus-visible:ring-saffron-500",
  navy: "bg-navy-800 text-white hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 focus-visible:ring-navy-500",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-navy-300 hover:bg-surface-2 dark:hover:border-navy-500 focus-visible:ring-navy-400",
  ghost: "text-muted hover:text-ink hover:bg-surface-2 focus-visible:ring-navy-400",
  danger: "bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600/20 focus-visible:ring-red-500",
  success: "bg-leaf-600 text-white hover:bg-leaf-700 focus-visible:ring-leaf-500",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold tracking-[0.01em] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
