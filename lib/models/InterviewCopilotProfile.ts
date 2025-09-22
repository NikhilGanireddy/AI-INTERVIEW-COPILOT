import { Schema, model, models } from "mongoose";

const FileBlobSchema = new Schema(
  {
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    data: { type: Buffer },
  },
  { _id: false }
);

const DocumentVariantSchema = new Schema(
  {
    mode: { type: String, enum: ["upload", "paste"], required: true },
    text: { type: String },
    file: FileBlobSchema,
  },
  { _id: false }
);

const InterviewCopilotProfileSchema = new Schema(
  {
    userId: { type: String, index: true, required: true },
    profileName: { type: String, required: true },
    jobRole: { type: String, required: true },
    resume: DocumentVariantSchema,
    jobDescription: DocumentVariantSchema,
    projectDetails: { type: String },
  },
  {
    timestamps: true,
  }
);

export const InterviewCopilotProfile =
  models.InterviewCopilotProfile ||
  model("InterviewCopilotProfile", InterviewCopilotProfileSchema);
