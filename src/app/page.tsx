import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyTournaments } from "@/lib/dal";
import { CreateTournamentForm } from "./tournaments/create-tournament-form";

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

  const tournaments = await listMyTournaments();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_320px]">
      <section className="grid content-start gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My tournaments</h1>
        {tournaments.length === 0 ? (
          <p className="text-muted-foreground">No tournaments yet. Add your first one.</p>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>
                  {t.format} · {new Date(t.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                  {t.location ? ` · ${t.location}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm capitalize text-muted-foreground">
                {t.status.replace("_", " ")}
              </CardContent>
            </Card>
          ))
        )}
      </section>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>New tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTournamentForm />
        </CardContent>
      </Card>
    </main>
  );
}
