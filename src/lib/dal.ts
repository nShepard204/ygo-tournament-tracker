import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { connection } from "next/server";

// Data Access Layer: every read/write goes through here so authorization
// lives in one place. Proxy redirects are only an optimistic first check.

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

// Fallback for when a user reaches the app before the Clerk webhook lands.
// Only calls the Clerk API (rate limited) when the local record is missing.
export async function ensureUserRecord(userId: string) {
  await connectDB();
  const existing = await User.exists({ clerkId: userId });
  if (existing) return;

  const clerkUser = await currentUser();
  if (!clerkUser) return;

  await User.updateOne(
    { clerkId: userId },
    {
      $setOnInsert: {
        clerkId: userId,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        name: [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(" "),
        eventLog: [],
      },
    },
    { upsert: true },
  );
}

// Plain, serializable shapes safe to pass to Client Components.
export type RoundDTO = {
  roundNum: number;
  tableNum: number | null;
  roundResult: boolean;
  dieRollResult: boolean;
  opponentsName: string;
  opponentsDeck: string;
  opponentsDeckSize: number;
  roundNotes: string;
};

export type EventDTO = {
  id: string;
  eventName: string;
  eventLocation: string;
  eventDateTime: string;
  playerCount: number;
  eventFormat: string;
  isPremierEvent: boolean;
  deck: string;
  eventNotes: string;
  roundLog: RoundDTO[];
  lastUpdated: string | null;
};

export async function listMyEvents(): Promise<EventDTO[]> {
  await connection();
  const userId = await requireUserId();
  await connectDB();

  const user = await User.findOne({ clerkId: userId }, { eventLog: 1 }).lean();
  if (!user) return [];

  return user.eventLog
    .map((e, i) => ({
      // Older documents may have events without an _id; fall back to position.
      id: e._id?.toString() ?? `idx-${i}`,
      eventName: e.eventName ?? "",
      eventLocation: e.eventLocation ?? "",
      eventDateTime: e.eventDateTime.toISOString(),
      playerCount: e.playerCount ?? 0,
      eventFormat: e.eventFormat,
      isPremierEvent: e.isPremierEvent ?? false,
      deck: e.deck ?? "",
      eventNotes: e.eventNotes ?? "",
      roundLog: e.roundLog.map((r) => ({
        roundNum: r.roundNum,
        tableNum: r.tableNum ?? null,
        roundResult: r.roundResult,
        dieRollResult: r.dieRollResult ?? false,
        opponentsName: r.opponentsName ?? "",
        opponentsDeck: r.opponentsDeck ?? "",
        opponentsDeckSize: r.opponentsDeckSize ?? 40,
        roundNotes: r.roundNotes ?? "",
      })),
      lastUpdated: e.lastUpdated?.toISOString() ?? null,
    }))
    .sort((a, b) => b.eventDateTime.localeCompare(a.eventDateTime));
}
