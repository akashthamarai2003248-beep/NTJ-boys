"use client";

import { useRef, useState, type FormEvent } from "react";
import { CalendarDays, Camera, MapPin, Phone, UserRound, X } from "lucide-react";
import type { Member, MemberInput, MemberPosition } from "@/lib/data/types";
import { MEMBER_POSITIONS } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { todayISO } from "@/lib/utils/date";

interface Props {
  initial?: Member | null;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: MemberInput) => void;
  onCancel: () => void;
}

export function MemberForm({ initial, submitting, error, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [role, setRole] = useState<MemberPosition>(initial?.role ?? "Member");
  const [joinedDate, setJoinedDate] = useState(initial?.joinedDate ?? todayISO());
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Please choose an image file");
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) return setLocalError("Member name is required");
    if (digits.length < 10) return setLocalError("Enter a valid 10-digit phone number");
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      phone: digits,
      street: street.trim() || "—",
      role,
      joinedDate,
      photo,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative"
          aria-label="Add profile photo"
        >
          <Avatar name={name || "?"} photo={photo} size="xl" />
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-navy-800 text-white transition-colors group-hover:bg-saffron-600">
            <Camera className="size-3.5" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickPhoto(e.target.files?.[0])}
        />
        <div>
          <p className="text-[13.5px] font-bold">Profile photo</p>
          <p className="text-[12px] text-muted">சுயவிவர புகைப்படம் · optional</p>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-500 hover:underline">
              <X className="size-3" /> Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" ta="பெயர்" required className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" leading={<UserRound className="size-4" />} />
        </Field>
        <Field label="Phone" ta="தொலைபேசி" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98400 00000" inputMode="tel" leading={<Phone className="size-4" />} />
        </Field>
        <Field label="Street / Area" ta="தெரு / பகுதி">
          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. 12, South Street" leading={<MapPin className="size-4" />} />
        </Field>
        <Field label="Role" ta="பதவி" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as MemberPosition)}>
            {MEMBER_POSITIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Joined date" ta="இணைந்த நாள்" required>
          <Input type="date" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} leading={<CalendarDays className="size-4" />} />
        </Field>
      </div>

      {(localError || error) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {localError ?? error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" variant="primary" loading={submitting}>
          <UserRound className="size-4" />
          {initial ? "Save changes" : "Add Member"}
        </Button>
      </div>
    </form>
  );
}
