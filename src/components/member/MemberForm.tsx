"use client";

import { useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, Phone, UserRound, X } from "lucide-react";
import type { Member, MemberInput } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { todayISO } from "@/lib/utils/date";
import { uploadImage } from "@/lib/client/upload";

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
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Please choose an image file");
    setLocalError(null);
    setUploading(true);
    setUploadInfo("Compressing to <400KB & uploading…");
    try {
      const result = await uploadImage(file, "members");
      setPhoto(result.url);
      setUploadInfo(`Compressed (${result.formattedSize}) · ${result.storage === "supabase" ? "Supabase Storage" : "Ready"}`);
    } catch (err) {
      setLocalError((err as Error).message || "Could not process image");
    } finally {
      setUploading(false);
    }
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
      street: initial?.street ?? "",
      role: initial?.role ?? "Member",
      joinedDate: initial?.joinedDate ?? todayISO(),
      photo,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative disabled:opacity-60"
          aria-label="Add profile photo"
        >
          <Avatar name={name || "?"} photo={photo} size="xl" />
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-navy-800 text-white transition-colors group-hover:bg-saffron-600">
            {uploading ? <Loader2 className="size-3.5 animate-spin text-saffron-300" /> : <Camera className="size-3.5" />}
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
          <p className="text-[12px] text-muted">சுயவிவர புகைப்படம் · &le;400 KB</p>
          {uploadInfo && (
            <p className="mt-0.5 text-[11px] font-semibold text-leaf-600 dark:text-leaf-400">
              {uploadInfo}
            </p>
          )}
          {photo && (
            <button
              type="button"
              onClick={() => { setPhoto(null); setUploadInfo(null); }}
              className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-500 hover:underline"
            >
              <X className="size-3" /> Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Full name" ta="பெயர்" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ravi Kumar"
            leading={<UserRound className="size-4" />}
            autoFocus
          />
        </Field>
        <Field label="Phone number" ta="தொலைபேசி" required>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98400 00000"
            inputMode="tel"
            leading={<Phone className="size-4" />}
          />
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
