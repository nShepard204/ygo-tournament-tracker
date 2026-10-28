"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LatestEventSummary } from "@/lib/dal";
import { addRoundToLatestEvent, type AddRoundState } from "./actions";

export function AddRoundDialog({
  trigger,
  latestEvent,
}: {
  trigger: ReactElement;
  latestEvent: LatestEventSummary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add round {latestEvent.nextRoundNum}</DialogTitle>
          <DialogDescription>
            To {latestEvent.eventName || "Untitled event"} ·{" "}
            {new Date(latestEvent.eventDateTime).toLocaleDateString(undefined, {
              timeZone: "UTC",
            })}
          </DialogDescription>
        </DialogHeader>
        <AddRoundForm
          defaultRoundNum={latestEvent.nextRoundNum}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddRoundForm({
  defaultRoundNum,
  onSuccess,
}: {
  defaultRoundNum: number;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<AddRoundState, FormData>(
    addRoundToLatestEvent,
    {},
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="roundNum">Round</Label>
          <Input
            id="roundNum"
            name="roundNum"
            type="number"
            min={1}
            defaultValue={defaultRoundNum}
            required
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tableNum">Table</Label>
          <Input
            id="tableNum"
            name="tableNum"
            type="number"
            min={0}
            placeholder="—"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Result</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["win", "loss"] as const).map((value) => (
            <label
              key={value}
              className="flex h-9 cursor-pointer items-center justify-center rounded-lg border text-sm capitalize has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
            >
              <input
                type="radio"
                name="roundResult"
                value={value}
                required
                className="sr-only"
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="dieRollResult" className="size-4" />
        Won the die roll
      </label>
      <div className="grid gap-2">
        <Label htmlFor="opponentsName">Opponent</Label>
        <Input id="opponentsName" name="opponentsName" placeholder="Name" />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <div className="grid gap-2">
          <Label htmlFor="opponentsDeck">Opponent&apos;s deck</Label>
          <Input
            id="opponentsDeck"
            name="opponentsDeck"
            placeholder="Branded"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="opponentsDeckSize">Deck size</Label>
          <Input
            id="opponentsDeckSize"
            name="opponentsDeckSize"
            type="number"
            min={40}
            max={60}
            defaultValue={40}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="roundNotes">Notes</Label>
        <Textarea id="roundNotes" name="roundNotes" rows={3} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add round"}
      </Button>
    </form>
  );
}
