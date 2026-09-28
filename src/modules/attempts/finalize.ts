import { Question } from "@/src/modules/questions/question.model";
import { scoreAttempt } from "./scoring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;

/**
 * Scores an attempt and flips it to "submitted". Idempotent — calling this on
 * an already-submitted attempt is a no-op — so both the explicit finish
 * endpoint and the defensive auto-expire checks in GET/PATCH can call it
 * without double-scoring.
 */
export async function finalizeAttempt(attempt: AnyDoc, test: AnyDoc) {
  if (attempt.status === "submitted") return attempt;

  const questionIds = attempt.questions.map((q: AnyDoc) => q.questionId);
  const questionDocs = await Question.find({ _id: { $in: questionIds } })
    .select("correctAnswer")
    .lean();
  const questionDocsById = new Map(
    questionDocs.map((q: AnyDoc) => [String(q._id), q]),
  );

  const summary = scoreAttempt(
    attempt.questions,
    attempt.answers,
    questionDocsById,
    test.negativeMarking,
  );

  attempt.results = summary.results;
  attempt.score = summary.score;
  attempt.totalMarks = summary.totalMarks;
  attempt.correctCount = summary.correctCount;
  attempt.wrongCount = summary.wrongCount;
  attempt.unattemptedCount = summary.unattemptedCount;
  attempt.status = "submitted";
  attempt.submittedAt = new Date();

  await attempt.save();
  return attempt;
}

export function isExpired(attempt: AnyDoc): boolean {
  return attempt.status === "in_progress" && Date.now() > new Date(attempt.expiresAt).getTime();
}
