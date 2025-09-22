// models/VoiceProfile.ts
import { Schema, model, models } from "mongoose";

const VoiceProfileSchema = new Schema(
    {
        userId: { type: String, index: true, required: true },
        userName: { type: String, required: true },
        elevenVoiceId: { type: String, required: true },
        name: { type: String, default: "My Voice" },
    },
    { timestamps: true }
);

export const VoiceProfile =
    models.VoiceProfile || model("VoiceProfile", VoiceProfileSchema);