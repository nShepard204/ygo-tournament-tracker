"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ensureUserRecord, requireUserId } from "@/lib/dal";
import { EVENT_FORMATS } from "@/lib/constants";
import { User } from "@/models/User";

// Every action here is a public POST endpoint: each one re-checks auth and only
// touches the signed-in user's own document (filtered by clerkId).

export type FormState = { error?: string; success?: boolean };
export type CreateEventState = FormState;
export type AddRoundState = FormState;

const EventSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required").max(120),
  eventLocation: z.string().trim().max(200).default(""),
  eventDateTime: z.coerce.date({ error: "Enter a valid date and time" }),
  playerCount: z.coerce.number().int().min(0).default(0),
  eventFormat: z.enum(EVENT_FORMATS),
  isPremierEvent: z.boolean(),
  deck: z.string().trim().max(120).default(""),
  eventNotes: z.string().max(2000).default(""),
});

const RoundSchema = z.object({
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
  opponentsDeckSize: z.coerce
    .number()
    .int()
    .min(40, "Decks are 40–60 cards")
    .max(60, "Decks are 40–60 cards")
    .default(40),
  roundNotes: z.string().max(2000).default(""),
});

function parseEvent(formData: FormData) {
  return EventSchema.safeParse({
    eventName: formData.get("eventName"),
    eventLocation: formData.get("eventLocation") ?? undefined,
    eventDateTime: formData.get("eventDateTime"),
    playerCount: formData.get("playerCount") || undefined,
    eventFormat: formData.get("eventFormat"),
    isPremierEvent: formData.get("isPremierEvent") === "on",
    deck: formData.get("deck") ?? undefined,
    eventNotes: formData.get("eventNotes") ?? undefined,
  });
}

function parseRound(formData: FormData) {
  return RoundSchema.safeParse({
    roundNum: formData.get("roundNum"),
    tableNum: formData.get("tableNum") || undefined,
    roundResult: formData.get("roundResult"),
    dieRollResult: formData.get("dieRollResult"),
    opponentsName: formData.get("opponentsName") ?? undefined,
    opponentsDeck: formData.get("opponentsDeck") ?? undefined,
    opponentsDeckSize: formData.get("opponentsDeckSize") || undefined,
    roundNotes: formData.get("roundNotes") ?? undefined,
  });
}

function toObjectId(id: string) {
  return isValidObjectId(id) ? new Types.ObjectId(id) : null;
}

function revalidateEvents() {
  revalidatePath("/");
  revalidatePath("/events");
}

// Prefixes each key so it can be $set on an array element, e.g. "eventLog.$.deck".
function setPaths(prefix: string, data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [`${prefix}.${k}`, v]));
}

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = parseEvent(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  await ensureUserRecord(userId);
  await User.updateOne(
    { clerkId: userId },
    { $push: { eventLog: { ...parsed.data, roundLog: [], lastUpdated: new Date() } } },
  );

  revalidateEvents();
  return { success: true };
}

export async function updateEvent(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eid = toObjectId(eventId);
  if (!eid) return { error: "This event can't be edited." };

  const parsed = parseEvent(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const res = await User.updateOne(
    { clerkId: userId, "eventLog._id": eid },
    { $set: { ...setPaths("eventLog.$", parsed.data), "eventLog.$.lastUpdated": new Date() } },
  );
  if (res.matchedCount === 0) return { error: "Event not found." };

  revalidateEvents();
  return { success: true };
}

export async function deleteEvent(eventId: string): Promise<FormState> {
  const userId = await requireUserId();
  const eid = toObjectId(eventId);
  if (!eid) return { error: "This event can't be deleted." };

  await connectDB();
  const res = await User.updateOne({ clerkId: userId }, { $pull: { eventLog: { _id: eid } } });
  if (res.modifiedCount === 0) return { error: "Event not found." };

  revalidateEvents();
  return { success: true };
}

// Adds a round to the most recently created event (the last entry in eventLog).
export async function addRoundToLatestEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = parseRound(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

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

  revalidateEvents();
  return { success: true };
}

export async function updateRound(
  eventId: string,
  roundId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eid = toObjectId(eventId);
  const rid = toObjectId(roundId);
  if (!eid || !rid) return { error: "This round can't be edited." };

  const parsed = parseRound(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const user = await User.findOne(
    { clerkId: userId, "eventLog._id": eid },
    { "eventLog.$": 1 },
  ).lean();
  const event = user?.eventLog[0];
  if (!event) return { error: "Event not found." };
  if (!event.roundLog.some((r) => r._id?.equals(rid))) return { error: "Round not found." };

  const clash = event.roundLog.some(
    (r) => r.roundNum === parsed.data.roundNum && !r._id?.equals(rid),
  );
  if (clash) return { error: `Round ${parsed.data.roundNum} is already logged for this event.` };

  // A blank Table field clears any previous table number.
  const { tableNum, ...rest } = parsed.data;
  await User.updateOne(
    { clerkId: userId },
    {
      $set: {
        ...setPaths("eventLog.$[e].roundLog.$[r]", rest),
        "eventLog.$[e].lastUpdated": new Date(),
        ...(tableNum !== undefined && { "eventLog.$[e].roundLog.$[r].tableNum": tableNum }),
      },
      ...(tableNum === undefined && { $unset: { "eventLog.$[e].roundLog.$[r].tableNum": "" } }),
    },
    { arrayFilters: [{ "e._id": eid }, { "r._id": rid }] },
  );

  revalidateEvents();
  return { success: true };
}

export async function deleteRound(eventId: string, roundId: string): Promise<FormState> {
  const userId = await requireUserId();
  const eid = toObjectId(eventId);
  const rid = toObjectId(roundId);
  if (!eid || !rid) return { error: "This round can't be deleted." };

  await connectDB();
  const res = await User.updateOne(
    { clerkId: userId, "eventLog._id": eid },
    {
      $pull: { "eventLog.$.roundLog": { _id: rid } },
      $set: { "eventLog.$.lastUpdated": new Date() },
    },
  );
  if (res.matchedCount === 0) return { error: "Round not found." };

  revalidateEvents();
  return { success: true };
}
