"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Menu } from "@/components/ui/Menu";

export interface RowExtraAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
}

export function RowActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  canEdit = true,
  canDelete = true,
  extras,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  extras?: RowExtraAction[];
}) {
  const [open, setOpen] = useState(false);
  const items = [
    ...(extras ?? []).map((x) => ({ label: x.label, icon: x.icon, onSelect: x.onSelect })),
    ...(canEdit && onEdit ? [{ label: editLabel, icon: Pencil, onSelect: onEdit }] : []),
    ...(canDelete && onDelete
      ? [{ label: deleteLabel, icon: Trash2, onSelect: onDelete, danger: true as const }]
      : []),
  ];
  if (items.length === 0) return null;
  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      items={items}
      trigger={
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Row actions"
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <MoreHorizontal className="size-4.5" />
        </button>
      }
    />
  );
}
