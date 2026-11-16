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
import type { GameResults, LatestEventSummary, RoundDTO } from "@/lib/dal";
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
  const [roundResult, setRoundResult] = useState(
    yesNoDefault(round?.roundResult, "win", "loss"),
  );
  const [games, setGames] = useState<GameResults>(
    round?.gameResults ?? { game1Result: null, game2Result: null, game3Result: null },
  );

  // Game 3 isn't played once the first two games went the same way.
  const game3Disabled = games.game1Result !== null && games.game1Result === games.game2Result;

  function setGame(key: keyof GameResults, value: boolean | null) {
    const gamesObj = { ...games, [key]: value };
    // A game 3 picked earlier is dropped once the first two games decide the round.
    if (gamesObj.game1Result !== null && gamesObj.game1Result === gamesObj.game2Result) {
      gamesObj.game3Result = null;
    }
    setGames(gamesObj);
    // Two games with the same result decide the round; otherwise leave the
    // round result as the player set it.
    const played = [gamesObj.game1Result, gamesObj.game2Result, gamesObj.game3Result];
    if (played.filter((g) => g === true).length >= 2) setRoundResult("win");
    else if (played.filter((g) => g === false).length >= 2) setRoundResult("loss");
  }

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
        <div className="grid gap-2">
          {([1, 2, 3] as const).map((n) => {
            const key = `game${n}Result` as const;
            const disabled = n === 3 && game3Disabled;
            return (
              <GameResultRow
                key={key}
                name={key}
                gameNum={n}
                value={games[key]}
                disabled={disabled}
                onChange={(v) => setGame(key, v)}
              />
            );
          })}
        </div>
        <YesNoCard
          name="roundResult"
          label="Won the round?"
          yes={{ value: "win", label: "Won the round" }}
          no={{ value: "loss", label: "Lost the round" }}
          value={roundResult}
          onValueChange={setRoundResult}
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
      <h3 className="border-b pb-1 text-base font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function yesNoDefault(value: boolean | null | undefined, yes: string, no: string) {
  if (value == null) return undefined;
  return value ? yes : no;
}

type YesNoOption = { value: string; label: string };

const YES_CHECKED_CLASS =
  "has-checked:border-green-600 has-checked:bg-green-600/25 has-checked:text-green-700 dark:has-checked:text-green-400";
const NO_CHECKED_CLASS =
  "has-checked:border-red-600 has-checked:bg-red-600/25 has-checked:text-red-700 dark:has-checked:text-red-400";

// A labeled radio pair: a green check and a red X, each half the width.
// Clicking the picked option again unpicks it; leaving both unpicked saves the
// round with no answer. Pass `value` + `onValueChange` to control it.
function YesNoCard({
  name,
  label,
  yes,
  no,
  defaultValue,
  value,
  onValueChange,
}: {
  name: string;
  label: string;
  yes: YesNoOption;
  no: YesNoOption;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = onValueChange !== undefined;
  const selected = controlled ? value : internal;
  const setSelected = controlled ? onValueChange : setInternal;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm leading-none font-medium select-none">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <YesNoButtons
          name={name}
          yes={yes}
          no={no}
          selected={selected}
          onSelect={setSelected}
          className="h-12"
          iconClassName="size-6"
        />
      </div>
    </fieldset>
  );
}

// One row per game: "Game #n" on the left, a compact win/loss pair on the right.
function GameResultRow({
  name,
  gameNum,
  value,
  disabled,
  onChange,
}: {
  name: string;
  gameNum: number;
  value: boolean | null;
  disabled?: boolean;
  onChange: (value: boolean | null) => void;
}) {
  const labelId = `${name}-label`;
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-disabled={disabled || undefined}
      className={`flex items-center justify-between gap-4 ${disabled ? "opacity-40" : ""}`}
    >
      <span id={labelId} className="text-sm font-medium select-none">
        Game #{gameNum} result
      </span>
      <div className="grid w-40 grid-cols-2 gap-2">
        <YesNoButtons
          name={name}
          yes={{ value: "win", label: `Won game ${gameNum}` }}
          no={{ value: "loss", label: `Lost game ${gameNum}` }}
          selected={yesNoDefault(value, "win", "loss")}
          onSelect={(v) => onChange(v === undefined ? null : v === "win")}
          disabled={disabled}
          className="h-9"
          iconClassName="size-5"
        />
      </div>
    </div>
  );
}

// The check / X radio buttons shared by YesNoCard and GameResultRow.
function YesNoButtons({
  name,
  yes,
  no,
  selected,
  onSelect,
  disabled,
  className,
  iconClassName,
}: {
  name: string;
  yes: YesNoOption;
  no: YesNoOption;
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
  disabled?: boolean;
  className: string;
  iconClassName: string;
}) {
  const options = [
    { ...yes, OptionIcon: Check, checkedClass: YES_CHECKED_CLASS },
    { ...no, OptionIcon: X, checkedClass: NO_CHECKED_CLASS },
  ];

  return options.map(({ value, label, OptionIcon, checkedClass }) => (
    <label
      key={value}
      title={label}
      className={`flex items-center justify-center rounded-lg border-2 border-input text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${className} ${checkedClass}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={value === selected}
        disabled={disabled}
        onChange={() => onSelect(value)}
        // A checked radio fires no change event when clicked again, so
        // clear it here. `selected` is still the pre-click value, so picking
        // a new option isn't undone.
        onClick={() => {
          if (value === selected) onSelect(undefined);
        }}
        aria-label={label}
        className="sr-only"
      />
      <OptionIcon className={iconClassName} strokeWidth={2.5} />
    </label>
  ));
}
