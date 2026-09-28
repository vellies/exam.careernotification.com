import { z } from "zod";

export const purchaseDecisionSchema = z.object({
  status: z.enum(["paid", "rejected"]),
});
