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
  return { success: true };
}
