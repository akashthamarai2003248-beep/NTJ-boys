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
    <div className={cn("inline-flex items-center gap-0.5 rounded-xl bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-pill"
                className="absolute inset-0 rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgba(10,16,30,0.06)]"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
