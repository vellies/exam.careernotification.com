import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requireUser } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { startAttemptSchema } from "@/src/modules/attempts/schemas";
import { shuffle } from "@/src/modules/attempts/scoring";
import { finalizeAttempt, isExpired } from "@/src/modules/attempts/finalize";
import { buildTakePayload } from "@/src/modules/attempts/serialize";
import { Test } from "@/src/modules/tests/test.model";
import { Question } from "@/src/modules/questions/question.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { hasSeriesAccess } from "@/src/modules/payments/access";
import { Purchase } from "@/src/modules/payments/purchase.model";

export async function GET() {
  const guard = await requireUser();
  if (guard) return guard;

  const session = await getSession();
  await connectDB();

  const attempts = await Attempt.find({ userId: session!.sub })
    .populate("testId", "title titleTa")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ items: attempts });
}

export async function POST(request: Request) {
  const guard = await requireUser();
  if (guard) return guard;

  const session = await getSession();
  const body = await request.json().catch(() => null);
  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectDB();

  const test = await Test.findById(parsed.data.testId);
  if (!test || test.status !== "published") {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }
  if (!test.questions?.length) {
    return NextResponse.json({ error: "This test has no questions yet" }, { status: 400 });
  }

  const existing = await Attempt.findOne({ userId: session!.sub, testId: test._id });

  if (existing) {
    if (existing.status === "submitted") {
      return NextResponse.json(
        { error: "You have already attempted this test", attemptId: String(existing._id) },
        { status: 409 },
      );
    }
    if (isExpired(existing)) {
      await finalizeAttempt(existing, test);
      return NextResponse.json(
        { error: "Time is up for this attempt", attemptId: String(existing._id) },
        { status: 409 },
      );
    }

    // Resume: same snapshot, just re-serve it with whatever answers are saved so far.
    const questionDocs = await Question.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: { $in: existing.questions.map((q: any) => q.questionId) },
    }).lean();
    const questionDocsById = new Map(questionDocs.map((q) => [String(q._id), q]));
    return NextResponse.json(buildTakePayload(existing, test, questionDocsById));
  }

  // Gates below only apply to STARTING a fresh attempt — resuming one already
  // in progress (handled above) is always allowed regardless of window/access,
  // since the student legitimately started it while both were satisfied.
  const testSeries = await TestSeries.findById(test.testSeriesId);
  if (!testSeries) {
    return NextResponse.json({ error: "Test series not found" }, { status: 404 });
  }

  const now0 = new Date();
  if (testSeries.startDate && now0 < testSeries.startDate) {
    return NextResponse.json(
      {
        error: `This test series opens on ${testSeries.startDate.toLocaleString()}`,
        reason: "not_open",
        scope: "series",
        opensAt: testSeries.startDate,
      },
      { status: 403 },
    );
  }
  if (testSeries.endDate && now0 > testSeries.endDate) {
    return NextResponse.json(
      {
        error: "This test series is no longer available",
        reason: "closed",
        scope: "series",
        closesAt: testSeries.endDate,
      },
      { status: 403 },
    );
  }
  if (test.opensAt && now0 < test.opensAt) {
    return NextResponse.json(
      {
        error: `This test opens at ${test.opensAt.toLocaleString()}`,
        reason: "not_open",
        scope: "test",
        opensAt: test.opensAt,
      },
      { status: 403 },
    );
  }
  if (test.closesAt && now0 > test.closesAt) {
    return NextResponse.json(
      {
        error: `This test closed at ${test.closesAt.toLocaleString()}`,
        reason: "closed",
        scope: "test",
        closesAt: test.closesAt,
      },
      { status: 403 },
    );
  }

  if (!(await hasSeriesAccess(session!.sub, testSeries))) {
    const purchase = await Purchase.findOne({
      userId: session!.sub,
      testSeriesId: testSeries._id,
    })
      .select("status")
      .lean();

    return NextResponse.json(
      {
        error:
          purchase?.status === "pending"
            ? "Your access request is awaiting admin approval"
            : "Purchase required to attempt tests in this series",
        reason: "purchase_required",
        testSeriesId: String(testSeries._id),
        seriesTitle: testSeries.title,
        price: testSeries.price,
        purchaseStatus: purchase?.status ?? null,
      },
      { status: 402 },
    );
  }

  // Fresh attempt: snapshot question + option order so later edits to the Test
  // (or a re-shuffle) never change what this student already started.
  const orderedTestQuestions = [...test.questions].sort((a, b) => a.order - b.order);
  const sequencedQuestions = test.shuffleQuestions
    ? shuffle(orderedTestQuestions)
    : orderedTestQuestions;

  const questionDocs = await Question.find({
    _id: { $in: sequencedQuestions.map((q) => q.questionId) },
  }).lean();
  const questionDocsById = new Map(questionDocs.map((q) => [String(q._id), q]));

  const snapshotQuestions = sequencedQuestions.map((tq, index) => {
    const questionDoc = questionDocsById.get(String(tq.questionId));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionIds = (questionDoc?.options ?? []).map((o: any) => o.id);
    return {
      questionId: tq.questionId,
      order: index + 1,
      marks: tq.marks,
      negativeMarks: tq.negativeMarks,
      optionOrder: test.shuffleOptions ? shuffle(optionIds) : [],
    };
  });

  const now = Date.now();
  const attempt = await Attempt.create({
    userId: session!.sub,
    testId: test._id,
    testSeriesId: test.testSeriesId,
    status: "in_progress",
    questions: snapshotQuestions,
    answers: [],
    startedAt: new Date(now),
    expiresAt: new Date(now + test.durationSeconds * 1000),
  });

  return NextResponse.json(buildTakePayload(attempt, test, questionDocsById), { status: 201 });
}
