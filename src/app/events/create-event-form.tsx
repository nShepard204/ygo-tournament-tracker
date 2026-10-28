"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_FORMATS } from "@/lib/constants";
import type { EventDTO } from "@/lib/dal";
import { createEvent, updateEvent, type FormState } from "./actions";

// "2026-10-28T19:00" in the browser's time zone, the format datetime-local expects.
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Creates a new event, or edits `event` when one is passed.
export function CreateEventForm({ event, onSuccess }: { event?: EventDTO; onSuccess?: () => void }) {
  const action = useMemo(() => (event ? updateEvent.bind(null, event.id) : createEvent), [event]);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    if (!event) formRef.current?.reset();
    onSuccess?.();
  }, [state, onSuccess, event]);

  // datetime-local values carry no time zone. Convert in the browser, which knows
  // the user's zone, so the server stores the right instant wherever it runs.
  const submit = (formData: FormData) => {
    const local = formData.get("eventDateTime");
    const date = typeof local === "string" && local ? new Date(local) : null;
    if (date && !Number.isNaN(date.getTime())) {
      formData.set("eventDateTime", date.toISOString());
    }
    formAction(formData);
  };

  return (
    <form ref={formRef} action={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="eventName">Event name</Label>
        <Input
          id="eventName"
          name="eventName"
          placeholder="Locals – Friday Night"
          defaultValue={event?.eventName}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="eventFormat">Format</Label>
          <select
            id="eventFormat"
            name="eventFormat"
            defaultValue={event?.eventFormat ?? "Advanced"}
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
          <Input
            id="playerCount"
            name="playerCount"
            type="number"
            min={0}
            placeholder="0"
            defaultValue={event?.playerCount || undefined}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventDateTime">Date &amp; time</Label>
        <Input
          id="eventDateTime"
          name="eventDateTime"
          type="datetime-local"
          defaultValue={event ? toLocalInputValue(event.eventDateTime) : undefined}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventLocation">Location</Label>
        <Input
          id="eventLocation"
          name="eventLocation"
          placeholder="Card shop name"
          defaultValue={event?.eventLocation}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deck">Deck played</Label>
        <Input id="deck" name="deck" placeholder="Snake-Eye Fire King" defaultValue={event?.deck} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eventNotes">Notes</Label>
        <textarea
          id="eventNotes"
          name="eventNotes"
          rows={3}
          defaultValue={event?.eventNotes}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPremierEvent"
          defaultChecked={event?.isPremierEvent}
          className="size-4"
        />
        Premier event (Regional, YCS, WCQ…)
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : event ? "Save changes" : "Add event"}
      </Button>
    </form>
  );
}
