"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBodyScrollLock, useIsMobile } from "@/lib/client/hooks";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  hideClose?: boolean;
}) {
  const isMobile = useIsMobile();
  useBodyScrollLock(open && typeof document !== "undefined");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px] dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: isMobile ? 32 : 30, stiffness: 360, mass: 0.9 }}
            className={cn(
              "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface text-ink shadow-modal",
              isMobile
                ? "rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
                : cn("rounded-2xl border border-line", maxWidth),
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  {title ? <h2 className="text-[17px] font-bold leading-snug">{title}</h2> : null}
                  {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
