import { Schema, model, models } from "mongoose";

const examCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ExamCategory = models.ExamCategory ?? model("ExamCategory", examCategorySchema);
