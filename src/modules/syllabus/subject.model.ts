import { Schema, model, models } from "mongoose";

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, trim: true, lowercase: true },
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    description: { type: String, trim: true, default: "" },
    descriptionTa: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

subjectSchema.index({ boardId: 1, slug: 1 }, { unique: true });

export const Subject = models.Subject ?? model("Subject", subjectSchema);
