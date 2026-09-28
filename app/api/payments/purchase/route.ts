import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requireUser } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { purchaseCreateSchema } from "@/src/modules/payments/schemas";
import { TestSeries } from "@/src/modules/test-series/test-series.model";

/**
 * Purchase requests need an admin to confirm them before they grant access —
 * this records the request as "pending"; it never sets "paid" itself. See
 * app/api/admin/purchases/[id]/route.ts for the approve/reject step, and
 * access.ts for how "paid" is the only status that unlocks a series.
 */
export async function POST(request: Request) {
  const guard = await requireUser();
  if (guard) return guard;

  const session = await getSession();
  const body = await request.json().catch(() => null);
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectDB();

  const testSeries = await TestSeries.findById(parsed.data.testSeriesId);
  if (!testSeries || testSeries.status !== "published") {
    return NextResponse.json({ error: "Test series not found" }, { status: 404 });
  }
  if (testSeries.access === "free") {
    return NextResponse.json(
      { error: "This test series is free — no purchase needed" },
      { status: 400 },
    );
  }

  const purchaseNow = new Date();
  if (testSeries.startDate && purchaseNow < testSeries.startDate) {
    return NextResponse.json(
      { error: `This series opens for purchase on ${testSeries.startDate.toLocaleString()}` },
      { status: 403 },
    );
  }
  if (testSeries.endDate && purchaseNow > testSeries.endDate) {
    return NextResponse.json(
      { error: "This series is no longer accepting purchases" },
      { status: 403 },
    );
  }

  const { phone, paymentMode, paymentReference, description } = parsed.data;

  const existing = await Purchase.findOne({
    userId: session!.sub,
    testSeriesId: testSeries._id,
  });
  if (existing) {
    if (existing.status === "rejected") {
      existing.set({
        status: "pending",
        amount: testSeries.price ?? 0,
        phone,
        paymentMode,
        paymentReference,
        description,
        requestedAt: new Date(),
        respondedAt: undefined,
        respondedBy: undefined,
      });
      await existing.save();
    }
    return NextResponse.json({ purchase: existing });
  }

  const purchase = await Purchase.create({
    userId: session!.sub,
    testSeriesId: testSeries._id,
    amount: testSeries.price ?? 0,
    status: "pending",
    provider: "dummy",
    phone,
    paymentMode,
    paymentReference,
    description,
    requestedAt: new Date(),
  });

  return NextResponse.json({ purchase }, { status: 201 });
}

export async function GET() {
  const guard = await requireUser();
  if (guard) return guard;

  const session = await getSession();
  await connectDB();

  const purchases = await Purchase.find({ userId: session!.sub })
    .populate("testSeriesId", "title titleTa slug")
    .sort({ requestedAt: -1 })
    .lean();

  return NextResponse.json({ items: purchases });
}
