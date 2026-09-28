import { z } from "zod";

export const purchaseCreateSchema = z.object({
  testSeriesId: z.string().trim().min(1, "Test series is required"),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .max(15, "Enter a valid phone number"),
  paymentMode: z.enum(["upi", "bank_transfer", "cash", "other"]),
  paymentReference: z
    .string()
    .trim()
    .min(1, "Enter your payment reference / transaction ID")
    .max(100),
  description: z.string().trim().max(500).optional().default(""),
});
