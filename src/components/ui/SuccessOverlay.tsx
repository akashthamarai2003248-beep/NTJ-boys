"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export function SuccessOverlay({
  open,
  title,
  subtitle,
  amount,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  amount?: string;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/60 p-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex w-full max-w-xs flex-col items-center rounded-3xl bg-surface px-8 py-9 text-center shadow-modal"
            initial={{ scale: 0.9, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 8, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
          >
            <motion.div
              className="relative flex size-16 items-center justify-center rounded-full bg-leaf-100 dark:bg-leaf-500/15"
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
            >
              <motion.svg viewBox="0 0 52 52" className="size-16">
                <motion.path
                  fill="none"
                  stroke="#218757"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27 l8 8 l16 -17"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
                />
              </motion.svg>
            </motion.div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
            {amount ? <div className="mt-1 text-xl font-extrabold tabular-nums text-leaf-600 dark:text-leaf-400">{amount}</div> : null}
            {subtitle ? <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{subtitle}</p> : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
