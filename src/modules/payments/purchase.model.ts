import { Schema, model, models } from "mongoose";

const purchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testSeriesId: { type: Schema.Types.ObjectId, ref: "TestSeries", required: true },
    amount: { type: Number, required: true, min: 0 },
    // "pending" until an admin confirms the (currently offline/manual) payment;
    // only "paid" grants access — see hasSeriesAccess in access.ts.
    status: {
      type: String,
      enum: ["pending", "paid", "rejected"],
      default: "pending",
      required: true,
    },
    // "dummy" today — swap in "razorpay" / "stripe" / etc. once a real gateway
    // is wired up. providerRef stands in for that gateway's transaction id.
    provider: { type: String, default: "dummy" },
    providerRef: { type: String, default: "" },
    // Student-supplied proof the admin uses to verify the (currently offline)
    // payment before confirming the request.
    phone: { type: String, required: true, trim: true },
    paymentMode: {
      type: String,
      enum: ["upi", "bank_transfer", "cash", "other"],
      required: true,
    },
    paymentReference: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    requestedAt: { type: Date, required: true, default: Date.now },
    respondedAt: { type: Date },
    respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// One purchase per (student, series) — buying twice just returns the existing one.
purchaseSchema.index({ userId: 1, testSeriesId: 1 }, { unique: true });

export const Purchase = models.Purchase ?? model("Purchase", purchaseSchema);
