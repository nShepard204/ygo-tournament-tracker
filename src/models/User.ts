import "server-only";
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Identity lives in Clerk; this collection mirrors the fields the app needs
// for relations and app-specific data. Kept in sync by the Clerk webhook.
const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    username: { type: String },
    displayName: { type: String },
    imageUrl: { type: String },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

// Reuse the compiled model across hot reloads to avoid OverwriteModelError.
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
