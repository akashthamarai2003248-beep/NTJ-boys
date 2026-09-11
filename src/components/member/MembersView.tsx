"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  HandCoins, Pencil, Phone, Plus, Search, Trash2, Trophy, Users,
} from "lucide-react";
import type { Member, MemberInput, MemberWithStats } from "@/lib/data/types";
import { api, qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { useLang } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { RowActions } from "@/components/shared/RowActions";
import { formatINR } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { MemberForm } from "./MemberForm";

interface MembersPayload {
  members: MemberWithStats[];
  total: number;
}

export function MembersView() {
  const { can } = usePermissions();
  const { t } = useLang();
  const writable = can.members;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 280);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const url = useMemo(() => `/api/members${qs({ q: debouncedQ })}`, [debouncedQ]);
  const { data, loading, reload } = useFetch<MembersPayload>(url);
  const members = data?.members ?? [];

  const openAdd = () => { setEditing(null); setFormError(null); setFormOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setFormError(null); setFormOpen(true); };

  const handleSubmit = async (input: MemberInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/members/${editing.id}`, input);
        toast.success(t("Member updated", "உறுப்பினர் விவரங்கள் புதுப்பிக்கப்பட்டன"));
      } else {
        await api.post<{ member: Member }>("/api/members", input);
        toast.success(t("Member added to the Mandram", "உறுப்பினர் மன்றத்தில் சேர்க்கப்பட்டார்"));
      }
      setFormOpen(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.del(`/api/members/${deleting.id}`);
      toast.success(t("Member removed", "உறுப்பினர் நீக்கப்பட்டார்"));
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasFilters = Boolean(q);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Community"
        title="உறுப்பினர்கள்"
        ta="Members"
        subtitle={`${data?.total ?? "…"} people power the Mandram — members & contributors`}
        actions={
          writable ? (
            <Button variant="primary" onClick={openAdd}>
              <Plus className="size-4" /> {t("Add Member", "உறுப்பினரைச் சேர்")}
            </Button>
          ) : undefined
        }
      />

      <div className="card-surface rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members by name or phone…"
            className="flex-1"
            leading={<Search className="size-4" />}
          />
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={() => setQ("")}>
              {t("Clear", "நீக்கு")}
            </Button>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-surface rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={hasFilters ? Search : Users}
          title={hasFilters ? "No members match" : "No members yet"}
          message={hasFilters ? "Try searching with a different name or phone number." : "Add the people who make the Mandram what it is."}
          action={writable && !hasFilters ? (
            <Button variant="primary" onClick={openAdd}><Plus className="size-4" /> {t("Add Member", "உறுப்பினரைச் சேர்")}</Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {members.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i} writable={writable} onEdit={() => openEdit(m)} onDelete={() => setDeleting(m)} />
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => { if (!submitting) { setFormOpen(false); setEditing(null); } }}
        title={editing ? t("Edit Member", "உறுப்பினரைத் திருத்து") : t("Add Member", "உறுப்பினரைச் சேர்")}
        description="உறுப்பினர் விவரங்கள் · Member details"
        maxWidth="max-w-md"
      >
        <MemberForm initial={editing} submitting={submitting} error={formError} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteBusy}
        title={t("Remove this member?", "இந்த உறுப்பினரை நீக்கவா?")}
        body={<>{t("This removes", "இது")} <b>{deleting?.name}</b> {t("from the member register. Contribution history is kept in the ledger.", "உறுப்பினர் பதிவேட்டில் இருந்து நீக்கும். பங்களிப்பு வரலாறு கணக்கேட்டில் பாதுகாக்கப்படும்.")}</>}
        confirmLabel={t("Remove", "நீக்கு")}
      />
    </div>
  );
}

function MemberCard({
  member,
  index,
  writable,
  onEdit,
  onDelete,
}: {
  member: MemberWithStats;
  index: number;
  writable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className={cn(
        "card-surface group relative rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
        writable && "cursor-pointer"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => {
        if (writable) onEdit();
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.name} photo={member.photo} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight">{member.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <Phone className="size-3.5 shrink-0 text-faint" />
            <a
              href={`tel:${member.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="tabular-nums hover:text-navy-700 hover:underline dark:hover:text-navy-200"
            >
              +91 {member.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
            </a>
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-leaf-50 px-3 py-2 dark:bg-leaf-500/10">
          <p className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-leaf-700 dark:text-leaf-400">
            <HandCoins className="size-3" /> Contributed
          </p>
          <p className="mt-0.5 text-[14px] font-extrabold tabular-nums text-leaf-800 dark:text-leaf-300">
            {member.contributionTotal > 0 ? formatINR(member.contributionTotal) : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-navy-50 px-3 py-2 dark:bg-navy-500/10">
          <p className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-navy-700 dark:text-navy-300">
            <Trophy className="size-3" /> Events
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[14px] font-extrabold tabular-nums text-navy-800 dark:text-navy-200">
            {member.eventsParticipated.length || "—"}
            {member.eventsParticipated.length > 0 && (
              <span className="truncate text-[10px] font-semibold text-faint">
                {member.eventsParticipated.join(", ")}
              </span>
            )}
          </p>
        </div>
      </div>

      {writable && (
        <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
          <span className="text-[11.5px] font-semibold text-faint">
            {member.role || "Member"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-bold text-ink transition hover:border-line-strong hover:bg-surface-2 active:scale-95 shadow-sm"
            >
              <Pencil className="size-3.5 text-navy-600 dark:text-saffron-400" />
              <span>{t("Edit", "திருத்து")}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/70 bg-red-50/60 px-3 py-1.5 text-[12px] font-bold text-red-600 transition hover:bg-red-100 active:scale-95 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 shadow-sm"
            >
              <Trash2 className="size-3.5" />
              <span>{t("Delete", "நீக்கு")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
