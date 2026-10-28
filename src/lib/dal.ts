import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Tournament } from "@/models/Tournament";

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
        username: clerkUser.username ?? undefined,
        displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || undefined,
        imageUrl: clerkUser.imageUrl,
      },
    },
    { upsert: true },
  );
}

// Plain, serializable shape safe to pass to Client Components.
export type TournamentDTO = {
  id: string;
  name: string;
  format: string;
  date: string;
  location: string | null;
  status: string;
};

export async function listMyTournaments(): Promise<TournamentDTO[]> {
  const userId = await requireUserId();
  await connectDB();

  const docs = await Tournament.find({ ownerId: userId }).sort({ date: -1 }).limit(50).lean();

  return docs.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    format: t.format,
    date: t.date.toISOString(),
    location: t.location ?? null,
    status: t.status ?? "upcoming",
  }));
}
