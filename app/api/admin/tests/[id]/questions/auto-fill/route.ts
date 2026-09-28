import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { Test } from "@/src/modules/tests/test.model";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { autoFillTestQuestionsSchema } from "@/src/modules/tests/schemas";

type Context = { params: Promise<{ id: string }> };

/**
 * Randomly samples questions from the (already-built) question bank matching
 * the given syllabus filters and appends them to the test — the "auto random
 * select from selected source" step, so admin picks a syllabus + count
 * instead of hand-picking every question.
 */
export async function POST(request: Request, { params }: Context) {
  const guard = await requirePermission("tests", "update");
  if (guard) return guard;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = autoFillTestQuestionsSchema.safeParse(body);
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

  const { boardId, subjectId, difficulty, count, marks, negativeMarks } =
    parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excludeIds = test.questions.map((q: any) => q.questionId);
  const filter: Record<string, unknown> = {
    status: "published",
    _id: { $nin: excludeIds },
  };
  // Filters are optional: a topic narrows to that topic, a syllabus alone
  // narrows to every topic under it, and neither means the whole bank.
  try {
    if (subjectId) {
      filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    } else if (boardId) {
      const topicIds = await Subject.find({
        boardId: new mongoose.Types.ObjectId(boardId),
      }).distinct("_id");
      filter.subjectId = { $in: topicIds };
    }
  } catch {
    return NextResponse.json({ error: "Invalid subject filter" }, { status: 400 });
  }
  if (difficulty) filter.difficulty = difficulty;

  const picked = await Question.aggregate([
    { $match: filter },
    { $sample: { size: count } },
  ]);

  if (picked.length === 0) {
    return NextResponse.json(
      { error: "No matching published questions found for these filters" },
      { status: 404 },
    );
  }

  let nextOrder = test.questions.length + 1;
  for (const q of picked) {
    test.questions.push({
      questionId: q._id,
      order: nextOrder++,
      marks,
      negativeMarks,
    });
  }
  await test.save();

  return NextResponse.json(
    { added: picked.length, requested: count, item: test },
    { status: 201 },
  );
}
