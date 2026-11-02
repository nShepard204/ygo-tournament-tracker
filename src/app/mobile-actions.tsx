import Link from "next/link";
import { cn } from "cn";
import { Bug, CalendarPlus, Lightbulb, ListPlus, Pencil, ScrollText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LatestEventSummary } from "@/lib/dal";
import { ReportBugDialog } from "./bugs/report-bug-dialog";
import { AddRoundDialog, EditLatestRoundDialog } from "./events/add-round-dialog";
import { CreateEventDialog } from "./events/create-event-dialog";
import { SuggestFeatureDialog } from "./features/suggest-feature-dialog";

// Square tiles: a large icon above a centered label that wraps if it's long.
const actionClass =
  "aspect-square h-auto w-full flex-col gap-3 px-3 text-center text-base leading-tight whitespace-normal [&_svg:not([class*='size-'])]:size-9";

// Mobile home screen: the main actions as a 2-column grid of large, thumb-friendly tiles.
export function MobileActions({ latestEvent }: { latestEvent: LatestEventSummary | null }) {
  return (
    <nav aria-label="Quick actions" className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        {/* cn() merges the size overrides; buttonVariants alone would keep both text-sm and text-base */}
        <Link href="/events" className={cn(buttonVariants({ variant: "outline" }), actionClass)}>
          <ScrollText />
          View Event Log
        </Link>
        <CreateEventDialog
          trigger={
            <Button variant="outline" className={actionClass}>
              <CalendarPlus />
              Create Event
            </Button>
          }
        />
        <ReportBugDialog
          trigger={
            <Button variant="outline" className={actionClass}>
              <Bug />
              Report a Bug
            </Button>
          }
        />
        <SuggestFeatureDialog
          trigger={
            <Button variant="outline" className={actionClass}>
              <Lightbulb />
              Suggest a Feature
            </Button>
          }
        />
      </div>
      {/* Sets the round actions apart from the general ones above */}
      <Separator className="my-1" />
      <div className="grid grid-cols-2 gap-3">
        {latestEvent ? (
          <AddRoundDialog
            latestEvent={latestEvent}
            trigger={
              <Button variant="outline" className={actionClass}>
                <ListPlus />
                Add Round to Latest Event
              </Button>
            }
          />
        ) : (
          <Button variant="outline" className={actionClass} disabled>
            <ListPlus />
            Add Round to Latest Event
          </Button>
        )}
        {latestEvent?.eventId && latestEvent.lastRound?.id ? (
          <EditLatestRoundDialog
            eventId={latestEvent.eventId}
            latestEvent={latestEvent}
            round={latestEvent.lastRound}
            roundId={latestEvent.lastRound.id}
            trigger={
              <Button variant="outline" className={actionClass}>
                <Pencil />
                Edit Round #{latestEvent.lastRound.roundNum}
              </Button>
            }
          />
        ) : (
          <Button variant="outline" className={actionClass} disabled>
            <Pencil />
            Edit Round
          </Button>
        )}
      </div>
      {!latestEvent && (
        <p className="px-1 text-xs text-muted-foreground">Create an event first to start logging rounds.</p>
      )}
    </nav>
  );
}
