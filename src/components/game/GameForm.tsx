"use client";

import { useState, type FormEvent } from "react";
import type { Event, Game, GameInput, GameKind, GameStatus } from "@/lib/data/types";
import { GAME_KINDS, GAME_STATUSES } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function GameForm({
  events,
  initial,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  events: Event[];
  initial: Game | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: GameInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tamilName, setTamilName] = useState(initial?.tamilName ?? "");
  const [kind, setKind] = useState<GameKind>(initial?.kind ?? "cricket");
  const [eventId, setEventId] = useState(initial?.eventId ?? events[0]?.id ?? "");
  const [status, setStatus] = useState<GameStatus>(initial?.status ?? "open");
  const [rules, setRules] = useState(initial?.rules ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      tamilName,
      kind,
      eventId: eventId || null,
      status,
      rules,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Game name" ta="விளையாட்டின் பெயர்" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tug of War" autoFocus />
        </Field>
        <Field label="Tamil name" ta="தமிழ் பெயர்">
          <Input value={tamilName} onChange={(e) => setTamilName(e.target.value)} placeholder="கயிறு இழுத்தல்" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Game type" ta="விளையாட்டு வகை" required>
          <Select value={kind} onChange={(e) => setKind(e.target.value as GameKind)}>
            {GAME_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.emoji} {k.label} · {k.ta}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" ta="நிலை">
          <Select value={status} onChange={(e) => setStatus(e.target.value as GameStatus)}>
            {GAME_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} · {s.ta}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Event (optional)" ta="நிகழ்வு">
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">General — no event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Rules / notes" ta="விதிமுறைகள்">
        <Textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={2} placeholder="Teams of 6 pullers, knockout format…" />
      </Field>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {initial ? "Save changes" : "Create game"}
        </Button>
      </div>
    </form>
  );
}
