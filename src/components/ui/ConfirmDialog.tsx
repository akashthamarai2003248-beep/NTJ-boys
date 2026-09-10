"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm" hideClose>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <div className="mt-1 text-[13.5px] leading-relaxed text-muted">{body}</div>
        </div>
        <div className="mt-3 flex w-full gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1 bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            loading={loading}
          >
            <Trash2 className="size-4" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
