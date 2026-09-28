import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requireUser } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { saveAnswerSchema } from "@/src/modules/attempts/schemas";
import { finalizeAttempt, isExpired } from "@/src/modules/attempts/finalize";
import { Test } from "@/src/modules/tests/test.model";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard) return guard;

  const { id } = await params;
  const session = await getSession();
  const body = await request.json().catch(() => null);
  const parsed = saveAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectDB();

  const attempt = await Attempt.findById(id);
  if (!attempt || String(attempt.userId) !== session!.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const test = await Test.findById(attempt.testId);
  if (!test) {
    return NextResponse.json({ error: "Test no longer exists" }, { status: 404 });
  }

  if (isExpired(attempt)) {
    await finalizeAttempt(attempt, test);
    return NextResponse.json({ error: "Time is up for this attempt" }, { status: 409 });
  }
  if (attempt.status === "submitted") {
    return NextResponse.json({ error: "This attempt is already submitted" }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const belongsToAttempt = attempt.questions.some(
    (q: any) => String(q.questionId) === parsed.data.questionId,
  );
  if (!belongsToAttempt) {
    return NextResponse.json({ error: "Question is not part of this attempt" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingAnswer = attempt.answers.find(
    (a: any) => String(a.questionId) === parsed.data.questionId,
  );
  if (existingAnswer) {
    if (parsed.data.selectedOptionId !== undefined) {
      existingAnswer.selectedOptionId = parsed.data.selectedOptionId;
    }
    if (parsed.data.flagged !== undefined) {
      existingAnswer.flagged = parsed.data.flagged;
    }
    existingAnswer.answeredAt = new Date();
  } else {
    attempt.answers.push({
      questionId: parsed.data.questionId,
      selectedOptionId: parsed.data.selectedOptionId ?? null,
      flagged: parsed.data.flagged ?? false,
      answeredAt: new Date(),
    });
  }

  await attempt.save();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answeredCount = attempt.answers.filter((a: any) => a.selectedOptionId).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flaggedCount = attempt.answers.filter((a: any) => a.flagged).length;
  return NextResponse.json({ ok: true, answeredCount, flaggedCount });
}
