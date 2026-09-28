import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { Test } from "@/src/modules/tests/test.model";
import { addTestQuestionSchema } from "@/src/modules/tests/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const guard = await requirePermission("tests", "update");
  if (guard) return guard;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = addTestQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectDB();

  const test = await Test.findById(id);
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const alreadyAdded = test.questions.some(
    (q: { questionId: { toString(): string } }) =>
      q.questionId.toString() === parsed.data.questionId,
  );
  if (alreadyAdded) {
    return NextResponse.json(
      { error: "This question is already in the test" },
      { status: 409 },
    );
  }

  test.questions.push({
    questionId: parsed.data.questionId,
    order: test.questions.length + 1,
    marks: parsed.data.marks,
    negativeMarks: parsed.data.negativeMarks,
  });
  await test.save();

  return NextResponse.json({ item: test }, { status: 201 });
}
