import { Schema, model, models } from "mongoose";

const attemptQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    order: { type: Number, required: true },
    marks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, required: true, default: 0 },
    // Snapshot of option order shown to this student (empty = natural Question.options order).
    optionOrder: { type: [String], default: [] },
  },
  { _id: false },
);

const attemptAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOptionId: { type: String, default: null },
    flagged: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attemptResultSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOptionId: { type: String, default: null },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    testSeriesId: { type: Schema.Types.ObjectId, ref: "TestSeries", required: true },
    status: {
      type: String,
      enum: ["in_progress", "submitted"],
      default: "in_progress",
      required: true,
    },
    // Immutable snapshot taken at start time, so later edits to the Test don't change a live attempt.
    questions: { type: [attemptQuestionSchema], default: [] },
    answers: { type: [attemptAnswerSchema], default: [] },
    results: { type: [attemptResultSchema], default: [] },
    score: { type: Number, default: null },
    totalMarks: { type: Number, default: null },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One attempt document per (student, test) — this is what makes "resume" and
// "no second attempt after submit" a DB-level guarantee rather than app logic.
attemptSchema.index({ userId: 1, testId: 1 }, { unique: true });

export const Attempt = models.Attempt ?? model("Attempt", attemptSchema);
