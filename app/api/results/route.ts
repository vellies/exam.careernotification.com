import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requireUser } from "@/src/lib/auth/guard";
import { getSession } from "@/src/lib/auth/session";
import { Attempt } from "@/src/modules/attempts/attempt.model";

export async function GET() {
  const guard = await requireUser();
  if (guard) return guard;

  const session = await getSession();
  await connectDB();

  const attempts = await Attempt.find({ userId: session!.sub, status: "submitted" })
    .populate("testId", "title titleTa")
    .sort({ submittedAt: -1 })
    .lean();

  const items = attempts.map((a) => ({
    id: String(a._id),
    testId: String(a.testId?._id ?? a.testId),
    testTitle: a.testId?.title ?? "Test",
    testTitleTa: a.testId?.titleTa ?? "",
    score: a.score,
    totalMarks: a.totalMarks,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    unattemptedCount: a.unattemptedCount,
    submittedAt: a.submittedAt,
  }));

  return NextResponse.json({ items });
}
