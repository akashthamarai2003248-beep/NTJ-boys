"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon = undefined,
  title,
  message,
  action,
  className,
  tone = "navy",
}: {
  icon?: LucideIcon | null;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
  tone?: "navy" | "saffron" | "leaf" | "gold";
}) {
  const toneClasses = {
    navy: "from-navy-100/80 to-navy-50 text-navy-500 dark:from-navy-500/15 dark:to-navy-500/5 dark:text-navy-300",
    saffron:
      "from-saffron-100/80 to-saffron-50 text-saffron-600 dark:from-saffron-500/15 dark:to-saffron-500/5 dark:text-saffron-400",
    leaf: "from-leaf-100/80 to-leaf-50 text-leaf-600 dark:from-leaf-500/15 dark:to-leaf-500/5 dark:text-leaf-400",
    gold: "from-gold-100/80 to-gold-100/40 text-gold-600 dark:from-gold-400/15 dark:to-gold-400/5 dark:text-gold-300",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}
    >
      {Icon ? (
        <div
          className={cn(
            "relative mb-4 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br",
            toneClasses[tone],
          )}
        >
          <Icon className="size-9" strokeWidth={1.6} />
        </div>
      ) : (
        <div className="mb-3 text-4xl">✨</div>
      )}
      <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
      {message ? <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}
