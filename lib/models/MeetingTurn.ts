import { Schema, model, models } from "mongoose";

const MeetingTurnSchema = new Schema(
  {
    userId: { type: String, index: true, required: true },
    sessionId: { type: String, index: true, required: true },
    profileId: { type: String, index: true, required: true },
    order: { type: Number },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

export const MeetingTurn =
  models.MeetingTurn || model("MeetingTurn", MeetingTurnSchema);
