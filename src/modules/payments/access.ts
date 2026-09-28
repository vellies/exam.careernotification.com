import { Purchase } from "./purchase.model";

/**
 * Free series need no purchase; paid/subscription series need a Purchase row
 * an admin has confirmed (status "paid") — a pending or rejected request
 * grants nothing.
 */
export async function hasSeriesAccess(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testSeries: { _id: any; access: string },
): Promise<boolean> {
  if (testSeries.access === "free") return true;
  const purchase = await Purchase.findOne({
    userId,
    testSeriesId: testSeries._id,
    status: "paid",
  }).lean();
  return !!purchase;
}
