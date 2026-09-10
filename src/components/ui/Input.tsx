"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, leading, trailing, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      {leading ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">{leading}</span>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-10.5 w-full rounded-xl border bg-surface px-3.5 text-sm text-ink shadow-[0_1px_0_rgba(10,16,30,0.02)] outline-none transition-all duration-150 placeholder:text-faint",
          leading && "pl-9",
          trailing && "pr-10",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-line-strong hover:border-navy-300 dark:hover:border-navy-500 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 dark:focus:border-navy-400",
          "disabled:opacity-55",
        )}
        {...rest}
      />
      {trailing ? <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span> : null}
    </div>
  );
});
