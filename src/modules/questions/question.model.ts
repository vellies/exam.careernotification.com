import { Schema, deleteModel, model, models } from "mongoose";

// English, Tamil or both — the zod schemas require at least one of the two.
const bilingualText = {
  en: { type: String, trim: true, default: "" },
  ta: { type: String, trim: true, default: "" },
};

const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: bilingualText, required: true, _id: false },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["mcq_single", "true_false", "integer"],
      default: "mcq_single",
      required: true,
    },
    question: { type: bilingualText, required: true, _id: false },
    options: { type: [optionSchema], default: [] },
    correctAnswer: { type: String, required: true, trim: true },
    explanation: {
      type: { en: String, ta: String },
      default: () => ({ en: "", ta: "" }),
      _id: false,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
  },
  { timestamps: true },
);

questionSchema.index({ status: 1, difficulty: 1 });
questionSchema.index({ subjectId: 1 });

// In dev, hot reload keeps Mongoose's model cache, so drop the cached model to
// pick up schema edits instead of validating against a stale schema.
if (process.env.NODE_ENV !== "production" && models.Question) deleteModel("Question");

export const Question = models.Question ?? model("Question", questionSchema);
