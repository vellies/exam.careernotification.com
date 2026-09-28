import { Schema, model, models } from "mongoose";

const examSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    examCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExamCategory",
      required: true,
    },
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

examSchema.index({ examCategoryId: 1 });

export const Exam = models.Exam ?? model("Exam", examSchema);
