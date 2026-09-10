"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className={cn("relative", className)}>
        <select
          ref={ref}
          className={cn(
            "h-10.5 w-full appearance-none rounded-xl border border-line-strong bg-surface px-3.5 pr-9 text-sm text-ink shadow-[0_1px_0_rgba(10,16,30,0.02)] outline-none transition-all duration-150 hover:border-navy-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 disabled:opacity-55 dark:hover:border-navy-500",
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
      </div>
    );
  },
);
