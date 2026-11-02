"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ensureUserRecord, requireUserId } from "@/lib/dal";
import { DECK_SIZE_MESSAGE, EVENT_FORMATS } from "@/lib/constants";
import { User } from "@/models/User";

// Every action here is a public POST endpoint: each one re-checks auth and only
// touches the signed-in user's own document (filtered by clerkId).

// `message` confirms a successful change to the user (shown as a toast).
export type FormState = { error?: string; success?: boolean; message?: string };
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
  // Blank means "next round" when adding and "unchanged" when editing.
  roundNum: z.coerce.number().int().min(1, "Round must be 1 or higher").optional(),
  tableNum: z.coerce.number().int().min(0).optional(),
  roundResult: z
    .enum(["win", "loss"])
    .transform((v) => v === "win")
    .optional(),
  dieRollResult: z
    .enum(["won", "lost"])
    .transform((v) => v === "won")
    .optional(),
  opponentsName: z.string().trim().max(120).default(""),
  opponentsDeck: z.string().trim().max(120).default(""),
  opponentsDeckSize: z.coerce
    .number()
    .int(DECK_SIZE_MESSAGE)
    .min(40, DECK_SIZE_MESSAGE)
    .max(60, DECK_SIZE_MESSAGE)
    .optional(),
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
    roundNum: formData.get("roundNum") || undefined,
    tableNum: formData.get("tableNum") || undefined,
    roundResult: formData.get("roundResult") || undefined,
    dieRollResult: formData.get("dieRollResult") || undefined,
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
  return { success: true, message: "Event created" };
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
  return { success: true, message: "Event updated" };
}

export async function deleteEvent(eventId: string): Promise<FormState> {
  const userId = await requireUserId();
  const eid = toObjectId(eventId);
  if (!eid) return { error: "This event can't be deleted." };

  await connectDB();
  const res = await User.updateOne({ clerkId: userId }, { $pull: { eventLog: { _id: eid } } });
  if (res.modifiedCount === 0) return { error: "Event not found." };

  revalidateEvents();
  return { success: true, message: "Event deleted" };
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

  const roundNum =
    parsed.data.roundNum ?? Math.max(0, ...latest.roundLog.map((r) => r.roundNum)) + 1;
  if (latest.roundLog.some((r) => r.roundNum === roundNum)) {
    return { error: `Round ${roundNum} is already logged for this event.` };
  }

  const newRound = { ...parsed.data, roundNum };
  const now = new Date();
  if (latest._id) {
    await User.updateOne(
      { clerkId: userId, "eventLog._id": latest._id },
      { $push: { "eventLog.$.roundLog": newRound }, $set: { "eventLog.$.lastUpdated": now } },
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
      { $push: { [`${path}.roundLog`]: newRound }, $set: { [`${path}.lastUpdated`]: now } },
    );
  }

  revalidateEvents();
  return { success: true, message: `Round ${roundNum} added` };
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
  const existing = event.roundLog.find((r) => r._id?.equals(rid));
  if (!existing) return { error: "Round not found." };

  const { roundNum, tableNum, roundResult, dieRollResult, opponentsDeckSize, ...rest } =
    parsed.data;
  const roundNumConflict =
    roundNum !== undefined &&
    event.roundLog.some((r) => r.roundNum === roundNum && !r._id?.equals(rid));
  if (roundNumConflict) return { error: `Round ${roundNum} is already logged for this event.` };

  // A blank Round field keeps the current number; other blank optional fields
  // clear any previous value.
  const optional = { tableNum, roundResult, dieRollResult, opponentsDeckSize };
  const toSet = Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined));
  const toUnset = Object.fromEntries(
    Object.entries(optional)
      .filter(([, v]) => v === undefined)
      .map(([k]) => [k, ""]),
  );
  await User.updateOne(
    { clerkId: userId },
    {
      $set: {
        ...setPaths("eventLog.$[e].roundLog.$[r]", {
          ...rest,
          ...toSet,
          ...(roundNum !== undefined && { roundNum }),
        }),
        "eventLog.$[e].lastUpdated": new Date(),
      },
      ...(Object.keys(toUnset).length > 0 && {
        $unset: setPaths("eventLog.$[e].roundLog.$[r]", toUnset),
      }),
    },
    { arrayFilters: [{ "e._id": eid }, { "r._id": rid }] },
  );

  revalidateEvents();
  return { success: true, message: `Round ${roundNum ?? existing.roundNum} updated` };
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
  return { success: true, message: "Round deleted" };
}
