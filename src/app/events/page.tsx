import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { listMyEvents } from "@/lib/dal";
import { EventCard } from "./event-card";

const EVENT_LOG_LIMIT = 10;

export default function EventLogPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl content-start gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Back to home" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Event log</h1>
      </div>
      {/* Reads the session, so it streams in behind a boundary */}
      <Suspense fallback={<p className="text-muted-foreground">Loading events…</p>}>
        <EventLog />
      </Suspense>
    </main>
  );
}

async function EventLog() {
  const events = await listMyEvents(EVENT_LOG_LIMIT);

  if (events.length === 0) {
    return <p className="text-muted-foreground">No events yet.</p>;
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">Your {events.length} most recent events</p>
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </>
  );
}
