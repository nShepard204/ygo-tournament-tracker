"use client";

import { useActionState, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Check, X } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { DECK_SIZE_MESSAGE } from "@/lib/constants";
import type { LatestEventSummary, RoundDTO } from "@/lib/dal";
import { addRoundToLatestEvent, updateRound, type FormState } from "./actions";

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

// Edits the round most recently added to the latest event.
export function EditLatestRoundDialog({
  trigger,
  eventId,
  latestEvent,
  round,
  roundId,
}: {
  trigger: ReactElement;
  eventId: string;
  latestEvent: LatestEventSummary;
  round: RoundDTO;
  roundId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Round #{round.roundNum}</DialogTitle>
          <DialogDescription>
            In {latestEvent.eventName || "Untitled event"} ·{" "}
            {new Date(latestEvent.eventDateTime).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <RoundForm
          key={roundId}
          action={updateRound.bind(null, eventId, roundId)}
          round={round}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Shared by "Add round" and "Edit round". Pass `round` to prefill for editing.
// Every field is optional so a round can be saved before it starts, mid-round,
// or after it ends, and filled in later by editing it.
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
  const [deckSizeError, setDeckSizeError] = useState<string>();

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state, onSuccess]);

  // Keyed on `state` alone so it fires once per save, not on every re-render.
  useEffect(() => {
    if (state.message) toast.add({ title: state.message, type: "success" });
  }, [state]);

  return (
    <form
      action={formAction}
      // Don't send a deck size the server will reject; the field shows why.
      onSubmit={(e) => {
        const error = deckSizeErrorFor(e.currentTarget.opponentsDeckSize);
        setDeckSizeError(error);
        if (error) e.preventDefault();
      }}
      className="grid gap-6"
    >
      <FormSection title="Pre-round info">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="roundNum">Round</Label>
            <Input
              id="roundNum"
              name="roundNum"
              type="number"
              min={1}
              defaultValue={round?.roundNum ?? defaultRoundNum}
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
        <YesNoCard
          name="dieRollResult"
          label="Won the die roll?"
          yes={{ value: "won", label: "Won the die roll" }}
          no={{ value: "lost", label: "Lost the die roll" }}
          defaultValue={yesNoDefault(round?.dieRollResult, "won", "lost")}
        />
        <div className="grid gap-2">
          <Label htmlFor="opponentsName">Opponent</Label>
          <Input id="opponentsName" name="opponentsName" placeholder="Name" defaultValue={round?.opponentsName} />
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-x-4 gap-y-2">
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
              placeholder="40"
              defaultValue={round?.opponentsDeckSize ?? undefined}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={deckSizeError ? true : undefined}
              aria-describedby={deckSizeError ? "opponentsDeckSizeError" : undefined}
              // Checked on blur so typing "5" on the way to "50" isn't flagged,
              // then on every change once flagged so the message clears promptly.
              onBlur={(e) => setDeckSizeError(deckSizeErrorFor(e.currentTarget))}
              onChange={(e) => {
                if (deckSizeError) setDeckSizeError(deckSizeErrorFor(e.currentTarget));
              }}
            />
          </div>
          {deckSizeError && (
            <p id="opponentsDeckSizeError" className="col-span-2 text-sm text-destructive">
              {deckSizeError}
            </p>
          )}
        </div>
      </FormSection>
      <FormSection title="Post-round info">
        <YesNoCard
          name="roundResult"
          label="Won the round?"
          yes={{ value: "win", label: "Won the round" }}
          no={{ value: "loss", label: "Lost the round" }}
          defaultValue={yesNoDefault(round?.roundResult, "win", "loss")}
        />
        <div className="grid gap-2">
          <Label htmlFor="roundNotes">Notes</Label>
          <Textarea id="roundNotes" name="roundNotes" rows={3} defaultValue={round?.roundNotes} />
        </div>
      </FormSection>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : round ? "Save round" : "Add round"}
      </Button>
    </form>
  );
}

// Blank is allowed; anything else must be a whole number from 40 to 60.
function deckSizeErrorFor(input: HTMLInputElement) {
  if (input.validity.badInput) return DECK_SIZE_MESSAGE;
  if (input.value === "") return undefined;
  const size = Number(input.value);
  return Number.isInteger(size) && size >= 40 && size <= 60 ? undefined : DECK_SIZE_MESSAGE;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h3 className="border-b pb-1 text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function yesNoDefault(value: boolean | null | undefined, yes: string, no: string) {
  if (value == null) return undefined;
  return value ? yes : no;
}

type YesNoOption = { value: string; label: string };

// A labeled radio pair: a green check and a red X, each half the width.
// Clicking the picked option again unpicks it; leaving both unpicked saves the
// round with no answer.
function YesNoCard({
  name,
  label,
  yes,
  no,
  defaultValue,
}: {
  name: string;
  label: string;
  yes: YesNoOption;
  no: YesNoOption;
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const options = [
    { ...yes, OptionIcon: Check, checkedClass: "has-checked:border-green-600 has-checked:bg-green-600/25 has-checked:text-green-700 dark:has-checked:text-green-400" },
    { ...no, OptionIcon: X, checkedClass: "has-checked:border-red-600 has-checked:bg-red-600/25 has-checked:text-red-700 dark:has-checked:text-red-400" },
  ];

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm leading-none font-medium select-none">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ value, label: optionLabel, OptionIcon, checkedClass }) => (
          <label
            key={value}
            title={optionLabel}
            className={`flex h-12 cursor-pointer items-center justify-center rounded-lg border-2 border-input text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${checkedClass}`}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={value === selected}
              onChange={() => setSelected(value)}
              // A checked radio fires no change event when clicked again, so
              // clear it here. `selected` is still the pre-click value, so picking
              // a new option isn't undone.
              onClick={() => {
                if (value === selected) setSelected(undefined);
              }}
              aria-label={optionLabel}
              className="sr-only"
            />
            <OptionIcon className="size-6" strokeWidth={2.5} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
