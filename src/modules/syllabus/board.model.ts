import { Schema, model, models } from "mongoose";

const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, trim: true, default: "" },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export const Board = models.Board ?? model("Board", boardSchema);
