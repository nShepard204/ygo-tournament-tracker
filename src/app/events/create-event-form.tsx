"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_FORMATS } from "@/lib/constants";
import { createEvent, type CreateEventState } from "./actions";

export function CreateEventForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState<CreateEventState, FormData>(createEvent, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="eventName">Event name</Label>
        <Input id="eventName" name="eventName" placeholder="Locals – Friday Night" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="eventFormat">Format</Label>
          <select
            id="eventFormat"
            name="eventFormat"
            defaultValue="Advanced"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            {EVENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="playerCount">Players</Label>
          <Input id="playerCount" name="playerCount" type="number" min={0} placeholder="0" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventDateTime">Date &amp; time</Label>
        <Input id="eventDateTime" name="eventDateTime" type="datetime-local" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventLocation">Location</Label>
        <Input id="eventLocation" name="eventLocation" placeholder="Card shop name" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deck">Deck played</Label>
        <Input id="deck" name="deck" placeholder="Snake-Eye Fire King" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventNotes">Notes</Label>
        <textarea
          id="eventNotes"
          name="eventNotes"
          rows={3}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPremierEvent" className="size-4" />
        Premier event (Regional, YCS, WCQ…)
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add event"}
      </Button>
    </form>
  );
}
