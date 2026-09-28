import { Schema, model, models } from "mongoose";

const testQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    order: { type: Number, required: true },
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
  },
  { _id: false },
);

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    titleTa: { type: String, trim: true, default: "" },
    testSeriesId: { type: Schema.Types.ObjectId, ref: "TestSeries", required: true },
    durationSeconds: { type: Number, required: true, default: 3600 },
    negativeMarking: { type: Boolean, default: true },
    defaultNegativeMarks: { type: Number, default: 0.25 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: true },
    // Admin-scheduled attempt window. null = open any time. Only gates STARTING
    // a fresh attempt — an attempt already in progress keeps running on its own
    // durationSeconds timer even if closesAt passes mid-attempt.
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    questions: { type: [testQuestionSchema], default: [] },
  },
  { timestamps: true },
);

testSchema.index({ testSeriesId: 1 });

testSchema.virtual("totalQuestions").get(function totalQuestions(this: {
  questions: unknown[];
}) {
  return this.questions.length;
});

testSchema.virtual("totalMarks").get(function totalMarks(this: {
  questions: { marks: number }[];
}) {
  return this.questions.reduce((sum, q) => sum + (q.marks ?? 0), 0);
});

testSchema.set("toJSON", { virtuals: true });
testSchema.set("toObject", { virtuals: true });

export const Test = models.Test ?? model("Test", testSchema);
