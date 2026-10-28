"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ensureUserRecord, requireUserId } from "@/lib/dal";
import { EVENT_FORMATS } from "@/lib/constants";
import { User } from "@/models/User";

const CreateEventSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required").max(120),
  eventLocation: z.string().trim().max(200).default(""),
  eventDateTime: z.coerce.date({ error: "Enter a valid date and time" }),
  playerCount: z.coerce.number().int().min(0).default(0),
  eventFormat: z.enum(EVENT_FORMATS),
  isPremierEvent: z.boolean(),
  deck: z.string().trim().max(120).default(""),
  eventNotes: z.string().max(2000).default(""),
});

export type CreateEventState = { error?: string; success?: boolean };

// Server Actions are public POST endpoints: always re-check auth here.
export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const userId = await requireUserId();

  const parsed = CreateEventSchema.safeParse({
    eventName: formData.get("eventName"),
    eventLocation: formData.get("eventLocation") ?? undefined,
    eventDateTime: formData.get("eventDateTime"),
    playerCount: formData.get("playerCount") || undefined,
    eventFormat: formData.get("eventFormat"),
    isPremierEvent: formData.get("isPremierEvent") === "on",
    deck: formData.get("deck") ?? undefined,
    eventNotes: formData.get("eventNotes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectDB();
  await ensureUserRecord(userId);
  await User.updateOne(
    { clerkId: userId },
    { $push: { eventLog: { ...parsed.data, roundLog: [], lastUpdated: new Date() } } },
  );

  revalidatePath("/");
  revalidatePath("/events");
  return { success: true };
}

const AddRoundSchema = z.object({
  roundNum: z.coerce.number().int().min(1, "Round must be 1 or higher"),
  tableNum: z.coerce.number().int().min(0).optional(),
  roundResult: z
    .enum(["win", "loss"], { error: "Pick whether you won the round" })
    .transform((v) => v === "win"),
  dieRollResult: z
    .enum(["won", "lost"], { error: "Pick whether you won the die roll" })
    .transform((v) => v === "won"),
  opponentsName: z.string().trim().max(120).default(""),
  opponentsDeck: z.string().trim().max(120).default(""),
  opponentsDeckSize: z.coerce.number().int().min(40, "Decks are 40–60 cards").max(60, "Decks are 40–60 cards").default(40),
  roundNotes: z.string().max(2000).default(""),
});

export type AddRoundState = { error?: string; success?: boolean };

// Adds a round to the most recently created event (the last entry in eventLog).
export async function addRoundToLatestEvent(
  _prev: AddRoundState,
  formData: FormData,
): Promise<AddRoundState> {
  const userId = await requireUserId();

  const parsed = AddRoundSchema.safeParse({
    roundNum: formData.get("roundNum"),
    tableNum: formData.get("tableNum") || undefined,
    roundResult: formData.get("roundResult"),
    dieRollResult: formData.get("dieRollResult"),
    opponentsName: formData.get("opponentsName") ?? undefined,
    opponentsDeck: formData.get("opponentsDeck") ?? undefined,
    opponentsDeckSize: formData.get("opponentsDeckSize") || undefined,
    roundNotes: formData.get("roundNotes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectDB();
  const user = await User.findOne({ clerkId: userId }, { eventLog: { $slice: -1 } }).lean();
  const latest = user?.eventLog.at(-1);
  if (!latest) return { error: "Create an event before adding rounds." };

  if (latest.roundLog.some((r) => r.roundNum === parsed.data.roundNum)) {
    return { error: `Round ${parsed.data.roundNum} is already logged for this event.` };
  }

  const now = new Date();
  if (latest._id) {
    await User.updateOne(
      { clerkId: userId, "eventLog._id": latest._id },
      { $push: { "eventLog.$.roundLog": parsed.data }, $set: { "eventLog.$.lastUpdated": now } },
    );
  } else {
    // Older events were stored without an _id; address the last one by position.
    const [{ count }] = await User.aggregate<{ count: number }>([
      { $match: { clerkId: userId } },
      { $project: { count: { $size: "$eventLog" } } },
    ]);
    const path = `eventLog.${count - 1}`;
    await User.updateOne(
      { clerkId: userId },
      { $push: { [`${path}.roundLog`]: parsed.data }, $set: { [`${path}.lastUpdated`]: now } },
    );
  }

  revalidatePath("/");
  revalidatePath("/events");
  return { success: true };
}
