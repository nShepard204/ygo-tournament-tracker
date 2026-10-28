import Link from "next/link";
import { cn } from "cn";
import { Bug, CalendarPlus, ListPlus, ScrollText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LatestEventSummary } from "@/lib/dal";
import { ReportBugDialog } from "./bugs/report-bug-dialog";
import { AddRoundDialog } from "./events/add-round-dialog";
import { CreateEventDialog } from "./events/create-event-dialog";

const actionClass = "h-14 w-full justify-start gap-3 px-4 text-base [&_svg:not([class*='size-'])]:size-5";

// Mobile home screen: the main actions as large, thumb-friendly buttons.
export function MobileActions({ latestEvent }: { latestEvent: LatestEventSummary | null }) {
  return (
    // pb-28 keeps the last items scrollable clear of the fixed bottom bar.
    <nav aria-label="Quick actions" className="grid gap-3 pb-28">
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
      {/* Pinned to the bottom of the screen, within thumb reach mid-tournament */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid gap-1 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur">
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
          <>
            <Button variant="outline" className={actionClass} disabled>
              <ListPlus />
              Add Round to Latest Event
            </Button>
            <p className="px-1 text-xs text-muted-foreground">Create an event first to start logging rounds.</p>
          </>
        )}
      </div>
    </nav>
  );
}
