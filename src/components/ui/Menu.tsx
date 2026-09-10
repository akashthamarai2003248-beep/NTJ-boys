"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useClickOutside } from "@/lib/client/hooks";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({
  open,
  onClose,
  items,
  trigger,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  trigger?: ReactNode;
  align?: "left" | "right";
}) {
  const ref = useClickOutside(onClose, open);
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 175px below and more room above, pop upwards
      if (spaceBelow < 175 && rect.top > 175) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [open, ref]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-50 min-w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop",
              align === "right" ? "right-0" : "left-0",
              openUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => {
                    onClose();
                    item.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium transition-colors disabled:opacity-45",
                    item.danger
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      : "text-ink hover:bg-surface-2",
                  )}
                >
                  {Icon ? <Icon className="size-4 shrink-0 opacity-80" /> : null}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
