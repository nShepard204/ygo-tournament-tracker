"use client";

import { Fragment, useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { LocalDateTime } from "@/components/local-date-time";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { EventDTO, RoundDTO } from "@/lib/dal";
import { deleteEvent, deleteRound, updateRound } from "./actions";
import { RoundForm } from "./add-round-dialog";
import { CreateEventForm } from "./create-event-form";

// e.g. "Oct 28, 2026, 7:00 PM EDT". Spelled out field by field because
// timeZoneName can't be combined with dateStyle/timeStyle (Intl throws).
const EVENT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

// The card summarizes the event; tapping it opens a popup with every round.
export function EventCard({ event: e }: { event: EventDTO }) {
  const wins = e.roundLog.filter((r) => r.roundResult).length;
  const losses = e.roundLog.length - wins;
  const rounds = [...e.roundLog].sort((a, b) => a.roundNum - b.roundNum);
  // Legacy events stored without an _id get a positional id and can't be modified.
  const canModify = !e.id.startsWith("idx-");
  const name = e.eventName || "Untitled event";

  return (
    <Dialog>
      <Card className="gap-0 py-0">
        {/* Only the summary opens the rounds popup; the footer buttons sit outside it. */}
        <DialogTrigger
          nativeButton={false}
          aria-label={`View rounds for ${name}`}
          render={
            <div className="flex cursor-pointer flex-col gap-(--card-spacing) py-(--card-spacing) text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset" />
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {e.eventName || "Untitled event"}
              {e.isPremierEvent && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                  Premier
                </span>
              )}
              <ChevronRight
                aria-hidden
                className="ml-auto size-4 shrink-0 text-muted-foreground"
              />
            </CardTitle>
            <CardDescription>
              {e.eventFormat} ·{" "}
              <LocalDateTime
                iso={e.eventDateTime}
                options={EVENT_TIME_FORMAT}
              />
              {e.eventLocation ? ` · ${e.eventLocation}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            <p>
              {/* A blank Players field is stored as 0, so show that as unknown */}
              Deck: {e.deck || "—"} · Players: {e.playerCount || "—"} · Record:{" "}
              {wins}-{losses}
            </p>
            {e.eventNotes && <p>{e.eventNotes}</p>}
          </CardContent>
        </DialogTrigger>
        {canModify && (
          <CardFooter className="justify-end gap-2 py-2">
            <EditEventButton event={e} />
            <ConfirmDeleteButton
              title="Delete this event?"
              description={
                <>
                  <strong>{name}</strong>
                  {rounds.length === 0
                    ? " will be permanently deleted."
                    : ` and its ${rounds.length === 1 ? "1 round" : `${rounds.length} rounds`} will be permanently deleted.`}
                </>
              }
              onConfirm={() => deleteEvent(e.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                  Delete
                </Button>
              }
            />
          </CardFooter>
        )}
      </Card>

      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{e.eventName || "Untitled event"}</DialogTitle>
          <DialogDescription>
            {rounds.length} {rounds.length === 1 ? "round" : "rounds"} · Record{" "}
            {wins}-{losses}
          </DialogDescription>
        </DialogHeader>
        {/* The header stays put while the round list scrolls */}
        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
          {rounds.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No rounds logged yet.
            </p>
          ) : (
            <Accordion multiple>
              {rounds.map((r, i) => (
                <Fragment key={r.roundNum}>
                  {i > 0 && <Separator />}
                  <RoundItem round={r} eventId={canModify ? e.id : null} />
                </Fragment>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoundItem({
  round: r,
  eventId,
}: {
  round: RoundDTO;
  eventId: string | null;
}) {
  const roundId = r.id;

  return (
    // Separators sit between items, so drop the accordion's own borders.
    <AccordionItem value={r.roundNum} className="not-last:border-b-0">
      <AccordionTrigger className="items-center hover:no-underline">
        <span className="flex min-w-0 items-center gap-2">
          <span className="w-16 shrink-0">Round {r.roundNum}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-white ${r.roundResult ? "bg-green-600" : "bg-red-600"}`}
          >
            {r.roundResult ? "W" : "L"}
          </span>
          <span className="truncate font-normal text-muted-foreground">
            vs {r.opponentsName || "Unknown"}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-muted/40 p-3">
          <Detail label="Result" value={r.roundResult ? "Win" : "Loss"} />
          <Detail label="Die roll" value={r.dieRollResult ? "Won" : "Lost"} />
          <Detail label="Table" value={r.tableNum ?? "—"} />
          <Detail label="Opponent" value={r.opponentsName || "—"} />
          <Detail label="Their deck" value={r.opponentsDeck || "—"} />
          <Detail label="Deck size" value={r.opponentsDeckSize} />
          {r.roundNotes && <Detail label="Notes" value={r.roundNotes} />}
        </dl>
        {eventId && roundId && (
          <div className="mt-2 flex justify-end gap-2">
            <EditRoundButton eventId={eventId} round={r} roundId={roundId} />
            <ConfirmDeleteButton
              title={`Delete round ${r.roundNum}?`}
              description={`Round ${r.roundNum} vs ${r.opponentsName || "Unknown"} will be permanently deleted.`}
              onConfirm={() => deleteRound(eventId, roundId)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                  Delete
                </Button>
              }
            />
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word whitespace-pre-wrap">{value}</dd>
    </>
  );
}

function EditEventButton({ event }: { event: EventDTO }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            <Pencil />
            Edit
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
        </DialogHeader>
        <CreateEventForm event={event} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditRoundButton({
  eventId,
  roundId,
  round,
}: {
  eventId: string;
  roundId: string;
  round: RoundDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            <Pencil />
            Edit
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit round {round.roundNum}</DialogTitle>
        </DialogHeader>
        <RoundForm
          action={updateRound.bind(null, eventId, roundId)}
          round={round}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
