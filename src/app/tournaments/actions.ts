"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ensureUserRecord, requireUserId } from "@/lib/dal";
import { TOURNAMENT_FORMATS } from "@/lib/constants";
import { Tournament } from "@/models/Tournament";

const CreateTournamentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  format: z.enum(TOURNAMENT_FORMATS),
  date: z.coerce.date({ error: "Enter a valid date" }),
  location: z.string().trim().max(200).optional(),
});

export type CreateTournamentState = { error?: string; success?: boolean };

// Server Actions are public POST endpoints: always re-check auth here.
export async function createTournament(
  _prev: CreateTournamentState,
  formData: FormData,
): Promise<CreateTournamentState> {
  const userId = await requireUserId();

  const parsed = CreateTournamentSchema.safeParse({
    name: formData.get("name"),
    format: formData.get("format"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectDB();
  await ensureUserRecord(userId);
  await Tournament.create({ ...parsed.data, ownerId: userId });

  revalidatePath("/");
  return { success: true };
}
