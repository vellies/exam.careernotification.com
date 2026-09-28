import { Schema, model, models } from "mongoose";

const testSeriesSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    titleTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    description: { type: String, trim: true, default: "" },
    descriptionTa: { type: String, trim: true, default: "" },
    access: {
      type: String,
      enum: ["free", "paid", "subscription"],
      default: "free",
    },
    // Ignored when access is "free". In rupees — a plain number is fine for the
    // dummy payment flow; swap to a minor-unit integer when a real gateway lands.
    price: { type: Number, default: 0, min: 0 },
    // Overall availability window for the whole series (enrollment + every
    // test inside it). null = always available. A Test's own opensAt/closesAt
    // is an additional, narrower window checked on top of this one.
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  { timestamps: true },
);

testSeriesSchema.index({ examId: 1 });

export const TestSeries = models.TestSeries ?? model("TestSeries", testSeriesSchema);
