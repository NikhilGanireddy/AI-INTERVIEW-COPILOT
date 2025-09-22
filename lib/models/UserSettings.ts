import { Schema, model, models } from "mongoose";

// Flexible per-user settings document.
// We keep strict: false to allow arbitrary keys to be stored via $set.
const UserSettingsSchema = new Schema(
  {
    userId: { type: String, index: true, unique: true, required: true },
  },
  { timestamps: true, strict: false }
);

export const UserSettings =
  models.UserSettings || model("UserSettings", UserSettingsSchema);

