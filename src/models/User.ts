import "server-only";
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { EVENT_FORMATS } from "@/lib/constants";

// One document per player: identity mirrored from Clerk, with their events
// (and each event's rounds) embedded. Reads of a player's history are a single
// document fetch; keep an eye on the 16MB document limit if logs grow huge.

const RoundSchema = new Schema({
  roundNum: { type: Number, required: true, min: 1 },
  tableNum: { type: Number, min: 0 },
  roundResult: { type: Boolean, required: true }, // true = win
  dieRollResult: { type: Boolean, default: false }, // true = won the die roll
  opponentsName: { type: String, trim: true, default: "" },
  opponentsDeck: { type: String, trim: true, default: "" },
  opponentsDeckSize: { type: Number, min: 40, max: 60, default: 40 },
  roundNotes: { type: String, default: "" },
});

const EventSchema = new Schema({
  eventName: { type: String, trim: true, maxlength: 120, default: "" },
  eventLocation: { type: String, trim: true, maxlength: 200, default: "" },
  eventDateTime: { type: Date, required: true },
  playerCount: { type: Number, min: 0, default: 0 },
  eventFormat: { type: String, enum: EVENT_FORMATS, required: true },
  isPremierEvent: { type: Boolean, default: false },
  deck: { type: String, trim: true, default: "" },
  eventNotes: { type: String, default: "" },
  roundLog: { type: [RoundSchema], default: [] },
  lastUpdated: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true, index: true },
  email: { type: String, default: "" },
  name: { type: String, default: "" },
  eventLog: { type: [EventSchema], default: [] },
});

export type UserDoc = InferSchemaType<typeof UserSchema>;

// Collection name is set explicitly; Mongoose would otherwise pluralize to "users".
const COLLECTION = process.env.MONGODB_COLLECTION ?? "app_data";

// Reuse the compiled model across hot reloads to avoid OverwriteModelError.
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ||
  model<UserDoc>("User", UserSchema, COLLECTION);
