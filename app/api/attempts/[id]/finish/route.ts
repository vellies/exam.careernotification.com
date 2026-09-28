import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requireUser } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { finalizeAttempt } from "@/src/modules/attempts/finalize";
import { buildResultPayload } from "@/src/modules/attempts/serialize";
import { Test } from "@/src/modules/tests/test.model";
import { Question } from "@/src/modules/questions/question.model";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard) return guard;

  const { id } = await params;
  const session = await getSession();
  await connectDB();

  const attempt = await Attempt.findById(id);
  if (!attempt || String(attempt.userId) !== session!.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const test = await Test.findById(attempt.testId);
  if (!test) {
    return NextResponse.json({ error: "Test no longer exists" }, { status: 404 });
  }

  // Idempotent: finishing an already-submitted attempt just returns its result
  // (covers the race between the client's own auto-submit timer and a manual click).
  await finalizeAttempt(attempt, test);

  const questionDocs = await Question.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _id: { $in: attempt.questions.map((q: any) => q.questionId) },
  }).lean();
  const questionDocsById = new Map(questionDocs.map((q) => [String(q._id), q]));

  return NextResponse.json(buildResultPayload(attempt, test, questionDocsById));
}
