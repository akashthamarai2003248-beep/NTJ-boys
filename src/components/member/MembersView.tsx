"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, HandCoins, MapPin, Phone, Plus, Search, Trophy, Users,
} from "lucide-react";
import type { Member, MemberInput, MemberWithStats } from "@/lib/data/types";
import { MEMBER_POSITIONS } from "@/lib/data/types";
import { api, qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { RowActions } from "@/components/shared/RowActions";
import { formatINR } from "@/lib/utils/money";
import { MemberForm } from "./MemberForm";

interface MembersPayload {
  members: MemberWithStats[];
  total: number;
}

function areaOf(street: string): string {
  const idx = street.indexOf(",");
  return (idx >= 0 ? street.slice(idx + 1) : street).trim();
}

export function MembersView() {
  const { can } = usePermissions();
  const writable = can.members;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 280);
  const [area, setArea] = useState("");
  const [role, setRole] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const url = useMemo(() => `/api/members${qs({ q: debouncedQ, area, role })}`, [debouncedQ, area, role]);
  const { data, loading, reload } = useFetch<MembersPayload>(url);
  const members = data?.members ?? [];

  const areas = useMemo(
    () => [...new Set((data?.members ?? []).map((m) => areaOf(m.street)).filter(Boolean))].sort(),
    [data],
  );

  const openAdd = () => { setEditing(null); setFormError(null); setFormOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setFormError(null); setFormOpen(true); };

  const handleSubmit = async (input: MemberInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/members/${editing.id}`, input);
        toast.success("Member updated");
      } else {
        await api.post<{ member: Member }>("/api/members", input);
        toast.success("Member added to the Mandram");
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
      toast.success("Member removed");
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasFilters = Boolean(q || area || role);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Community"
        title="உறுப்பினர்கள்"
        ta="Members"
        subtitle={`${data?.total ?? "…"} people power the Mandram — board, volunteers and members`}
        actions={
          writable ? (
            <Button variant="primary" onClick={openAdd}>
              <Plus className="size-4" /> Add Member
            </Button>
          ) : undefined
        }
      />

      <div className="card-surface rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, street or phone…"
            className="min-w-44 flex-1"
            leading={<Search className="size-4" />}
          />
          <Select value={area} onChange={(e) => setArea(e.target.value)} className="min-w-40">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="min-w-36">
            <option value="">All roles</option>
            {MEMBER_POSITIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setArea(""); setRole(""); }}>
              Clear filters
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
          message={hasFilters ? "Try a different name, area or role." : "Add the people who make the Mandram what it is."}
          action={writable && !hasFilters ? (
            <Button variant="primary" onClick={openAdd}><Plus className="size-4" /> Add Member</Button>
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
        title={editing ? "Edit Member" : "Add Member"}
        description="உறுப்பினர் · board position, area and contact"
        maxWidth="max-w-xl"
      >
        <MemberForm initial={editing} submitting={submitting} error={formError} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteBusy}
        title="Remove this member?"
        body={<>This removes <b>{deleting?.name}</b> from the member register. Contribution history is kept in the ledger.</>}
        confirmLabel="Remove"
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
  const joined = new Date(member.joinedDate).getFullYear();
  return (
    <div
      className="card-surface group relative rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        <RowActions canEdit={writable} canDelete={writable} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={member.name} photo={member.photo} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold tracking-tight">{member.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <RoleBadge role={member.role} />
            {member.role !== "Member" && (
              <span className="text-[11px] font-semibold text-gold-600 dark:text-gold-400">★ Board</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3.5 space-y-1.5 text-[12.5px] text-muted">
        <p className="flex items-center gap-2 truncate">
          <Phone className="size-3.5 shrink-0 text-faint" />
          <a href={`tel:${member.phone}`} className="tabular-nums hover:text-navy-700 hover:underline dark:hover:text-navy-200">
            +91 {member.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
          </a>
        </p>
        <p className="flex items-center gap-2 truncate">
          <MapPin className="size-3.5 shrink-0 text-faint" />
          {member.street}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0 text-faint" />
          Member since {joined}
        </p>
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
    </div>
  );
}
