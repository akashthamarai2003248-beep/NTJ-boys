"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex w-full sm:w-auto items-center gap-1 rounded-xl bg-surface-2/90 p-1 backdrop-blur", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 sm:flex-initial min-w-0 text-center rounded-[10px] px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-bold transition-all duration-150",
              active ? "text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-pill"
                className="absolute inset-0 rounded-[10px] border border-line bg-surface shadow-[0_1px_3px_rgba(10,16,30,0.08)]"
                transition={{ type: "spring", damping: 30, stiffness: 450 }}
              />
            )}
            <span className="relative z-10 block truncate text-center">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
