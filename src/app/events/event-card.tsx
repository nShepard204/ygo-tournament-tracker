"use client";

import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <Dialog>
      <DialogTrigger
        nativeButton={false}
        aria-label={`View rounds for ${e.eventName || "Untitled event"}`}
        render={
          <Card className="cursor-pointer text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50" />
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
            <LocalDateTime iso={e.eventDateTime} options={EVENT_TIME_FORMAT} />
            {e.eventLocation ? ` · ${e.eventLocation}` : ""}
            {e.playerCount ? ` · ${e.playerCount} players` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>
            Deck: {e.deck || "—"} · Record: {wins}-{losses}
          </p>
          {e.eventNotes && <p>{e.eventNotes}</p>}
        </CardContent>
      </DialogTrigger>

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
                  <RoundItem round={r} />
                </Fragment>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoundItem({ round: r }: { round: RoundDTO }) {
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
