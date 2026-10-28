import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestCreatedEvent, listMyEvents } from "@/lib/dal";
import { CreateEventForm } from "./events/create-event-form";
import { EventCard } from "./events/event-card";
import { MobileActions } from "./mobile-actions";

export default function Home() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <HomeContent />
    </Suspense>
  );
}

// auth() reads the request, so with cacheComponents it must render inside Suspense.
async function HomeContent() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Track your Yu-Gi-Oh! tournaments</h1>
        <p className="text-muted-foreground">Sign in to log events, decks, and results.</p>
      </main>
    );
  }

  const [events, latestEvent] = await Promise.all([listMyEvents(), getLatestCreatedEvent()]);

  return (
    <>
      {/* Mobile: quick-action buttons */}
      <main className="w-full px-4 py-6 md:hidden">
        <MobileActions latestEvent={latestEvent} />
      </main>

      {/* Desktop: event list beside the new-event form */}
      <main className="mx-auto hidden w-full max-w-5xl gap-6 px-4 py-8 md:grid md:grid-cols-[1fr_320px]">
        <section className="grid content-start gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My events</h1>
          {events.length === 0 ? (
            <p className="text-muted-foreground">No events yet. Add your first one.</p>
          ) : (
            events.map((e) => <EventCard key={e.id} event={e} />)
          )}
        </section>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New event</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEventForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
