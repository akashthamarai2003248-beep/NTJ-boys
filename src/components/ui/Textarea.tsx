"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_0_rgba(10,16,30,0.02)] outline-none transition-all duration-150 placeholder:text-faint hover:border-navy-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 disabled:opacity-55 dark:hover:border-navy-500",
          className,
        )}
        {...rest}
      />
    );
  },
);
