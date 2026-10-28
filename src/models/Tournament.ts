import "server-only";
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { TOURNAMENT_FORMATS, TOURNAMENT_STATUSES } from "@/lib/constants";

const TournamentSchema = new Schema(
  {
    // Clerk user id of the creator. Every query must filter on this.
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    format: { type: String, enum: TOURNAMENT_FORMATS, required: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: TOURNAMENT_STATUSES, default: "upcoming" },
  },
  { timestamps: true },
);

TournamentSchema.index({ ownerId: 1, date: -1 });

export type TournamentDoc = InferSchemaType<typeof TournamentSchema>;

export const Tournament: Model<TournamentDoc> =
  (models.Tournament as Model<TournamentDoc>) ||
  model<TournamentDoc>("Tournament", TournamentSchema);
