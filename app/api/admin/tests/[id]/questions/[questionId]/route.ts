import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { Test } from "@/src/modules/tests/test.model";

type Context = { params: Promise<{ id: string; questionId: string }> };

export async function DELETE(_req: Request, { params }: Context) {
  const guard = await requirePermission("tests", "update");
  if (guard) return guard;

  const { id, questionId } = await params;

  await connectDB();

  const test = await Test.findById(id);
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  test.questions = test.questions
    .filter(
      (q: { questionId: { toString(): string } }) =>
        q.questionId.toString() !== questionId,
    )
    .map((q: { order: number }, index: number) => ({ ...q, order: index + 1 }));

  await test.save();

  return NextResponse.json({ item: test });
}
