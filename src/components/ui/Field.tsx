"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useLang } from "@/lib/i18n";

export function Field({
  label,
  ta,
  required,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  ta?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const { lang } = useLang();
  // label/ta pairs render per language: en → English, ta → தமிழ்,
  // both → தமிழ் · English (Tamil leads).
  const shown =
    !ta || typeof label !== "string"
      ? label
      : lang === "en"
        ? label
        : lang === "ta"
          ? ta
          : `${ta} · ${label}`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || ta) && (
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-[13px] font-semibold text-ink">
            {shown}
            {required ? <span className="ml-0.5 text-red-500">*</span> : null}
          </label>
        </div>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
