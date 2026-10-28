import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyEvents } from "@/lib/dal";
import { CreateEventForm } from "./events/create-event-form";

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

  const events = await listMyEvents();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_320px]">
      <section className="grid content-start gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My events</h1>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No events yet. Add your first one.</p>
        ) : (
          events.map((e) => {
            const wins = e.roundLog.filter((r) => r.roundResult).length;
            const losses = e.roundLog.length - wins;
            return (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {e.eventName || "Untitled event"}
                    {e.isPremierEvent && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                        Premier
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {e.eventFormat} ·{" "}
                    {new Date(e.eventDateTime).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}
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
              </Card>
            );
          })
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
  );
}
