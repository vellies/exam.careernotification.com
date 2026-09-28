import { Schema, deleteModel, model, models } from "mongoose";
import { EXAM_CATEGORY_TYPE_VALUES } from "./category-types";

const examCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    type: {
      type: String,
      enum: EXAM_CATEGORY_TYPE_VALUES,
      default: "others",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// In dev, hot reload keeps Mongoose's model cache, so drop the cached model to
// pick up schema edits instead of validating against a stale schema.
if (process.env.NODE_ENV !== "production" && models.ExamCategory) deleteModel("ExamCategory");

export const ExamCategory = models.ExamCategory ?? model("ExamCategory", examCategorySchema);
