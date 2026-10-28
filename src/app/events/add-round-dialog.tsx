"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { Check, Dice6, Trophy, X, type LucideIcon } from "lucide-react";
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
import type { LatestEventSummary, RoundDTO } from "@/lib/dal";
import { addRoundToLatestEvent, type FormState } from "./actions";

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
            {/* Dialog content only renders in the browser, so this uses the viewer's time zone */}
            {new Date(latestEvent.eventDateTime).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <RoundForm
          action={addRoundToLatestEvent}
          defaultRoundNum={latestEvent.nextRoundNum}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Shared by "Add round" and "Edit round". Pass `round` to prefill for editing.
export function RoundForm({
  action,
  round,
  defaultRoundNum,
  onSuccess,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  round?: RoundDTO;
  defaultRoundNum?: number;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

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
            defaultValue={round?.roundNum ?? defaultRoundNum}
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
            defaultValue={round?.tableNum ?? undefined}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <YesNoCard
          name="roundResult"
          legend="Round result"
          prompt="Won the round?"
          Icon={Trophy}
          yes={{ value: "win", label: "Won the round" }}
          no={{ value: "loss", label: "Lost the round" }}
          defaultValue={round ? (round.roundResult ? "win" : "loss") : undefined}
        />
        <YesNoCard
          name="dieRollResult"
          legend="Die roll"
          prompt="Won the die roll?"
          Icon={Dice6}
          yes={{ value: "won", label: "Won the die roll" }}
          no={{ value: "lost", label: "Lost the die roll" }}
          defaultValue={round ? (round.dieRollResult ? "won" : "lost") : undefined}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="opponentsName">Opponent</Label>
        <Input id="opponentsName" name="opponentsName" placeholder="Name" defaultValue={round?.opponentsName} />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <div className="grid gap-2">
          <Label htmlFor="opponentsDeck">Opponent&apos;s deck</Label>
          <Input
            id="opponentsDeck"
            name="opponentsDeck"
            placeholder="Branded"
            defaultValue={round?.opponentsDeck}
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
            defaultValue={round?.opponentsDeckSize ?? 40}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="roundNotes">Notes</Label>
        <Textarea id="roundNotes" name="roundNotes" rows={3} defaultValue={round?.roundNotes} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : round ? "Save round" : "Add round"}
      </Button>
    </form>
  );
}

type YesNoOption = { value: string; label: string };

// A radio pair styled as a card: an icon and prompt above a green check and a
// red X. Not `required`: iOS browsers often block submit without showing why,
// so the server action's validation error is shown in the form instead.
function YesNoCard({
  name,
  legend,
  prompt,
  Icon,
  yes,
  no,
  defaultValue,
}: {
  name: string;
  legend: string;
  prompt: string;
  Icon: LucideIcon;
  yes: YesNoOption;
  no: YesNoOption;
  defaultValue?: string;
}) {
  const options = [
    { ...yes, OptionIcon: Check, checkedClass: "has-checked:border-green-600 has-checked:bg-green-600 has-checked:text-white" },
    { ...no, OptionIcon: X, checkedClass: "has-checked:border-red-600 has-checked:bg-red-600 has-checked:text-white" },
  ];

  return (
    <fieldset className="flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3">
      <legend className="sr-only">{legend}</legend>
      <Icon aria-hidden className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <p aria-hidden className="text-center text-xs font-medium">
        {prompt}
      </p>
      <div className="flex gap-3">
        {options.map(({ value, label, OptionIcon, checkedClass }) => (
          <label
            key={value}
            title={label}
            className={`flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-input text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${checkedClass}`}
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={value === defaultValue}
              aria-label={label}
              className="sr-only"
            />
            <OptionIcon className="size-5" strokeWidth={2.5} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
