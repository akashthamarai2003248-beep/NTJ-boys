"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onChange,
  className,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);
  const shown = pages <= 7 ? pageNumbers : [1, page - 1, page, page + 1, pages].filter(
    (p, i, a) => p >= 1 && p <= pages && a.indexOf(p) === i,
  );
  return (
    <div className={cn("flex items-center justify-between gap-3 px-1 pt-4 text-[12.5px]", className)}>
      <p className="text-muted">
        Showing <span className="font-semibold text-ink tabular-nums">{from}–{to}</span> of{" "}
        <span className="font-semibold text-ink tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-[12px] font-bold tabular-nums text-muted sm:hidden">
          {page} / {pages}
        </span>
        {shown.map((p, i) => (
          <button
            key={`${p}-${i}`}
            onClick={() => onChange(p)}
            className={cn(
              "hidden min-w-7 rounded-lg px-1.5 py-1 text-center font-semibold tabular-nums transition-colors sm:block",
              p === page ? "bg-navy-800 text-white dark:bg-navy-600" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
