import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { purchaseDecisionSchema } from "@/src/modules/payments/admin-schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requirePermission("purchases", "update");
  if (guard) return guard;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = purchaseDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const session = await getSession();
  await connectDB();

  const purchase = await Purchase.findById(id);
  if (!purchase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (purchase.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been decided" },
      { status: 409 },
    );
  }

  purchase.set({
    status: parsed.data.status,
    respondedAt: new Date(),
    respondedBy: session!.sub,
  });
  await purchase.save();

  return NextResponse.json({ item: purchase });
}
