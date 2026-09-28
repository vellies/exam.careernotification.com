import type { Model } from "mongoose";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import { Exam } from "@/src/modules/exams/exam.model";
import { Board } from "@/src/modules/syllabus/board.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Question } from "@/src/modules/questions/question.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Test } from "@/src/modules/tests/test.model";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { User } from "@/src/modules/users/user.model";

type Dependent = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  field: string;
  singular: string;
  plural: string;
};

const dep = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  field: string,
  singular: string,
  plural = `${singular}s`,
): Dependent => ({ model, field, singular, plural });

/**
 * Every place a record can be referenced from, keyed by the referenced
 * model's name. A record with any referrer can't be deleted — otherwise the
 * referrers would be left pointing at nothing.
 */
const DEPENDENTS: Record<string, Dependent[]> = {
  ExamCategory: [dep(Exam, "examCategoryId", "exam")],
  Exam: [
    dep(TestSeries, "examId", "test series", "test series"),
    dep(Board, "examId", "subject"),
  ],
  TestSeries: [
    dep(Test, "testSeriesId", "test"),
    dep(Purchase, "testSeriesId", "purchase request"),
    dep(Attempt, "testSeriesId", "attempt"),
  ],
  Test: [dep(Attempt, "testId", "attempt")],
  Board: [dep(Subject, "boardId", "topic")],
  Subject: [dep(Question, "subjectId", "question")],
  Question: [
    dep(Test, "questions.questionId", "test"),
    dep(Attempt, "questions.questionId", "attempt"),
  ],
  User: [
    dep(Purchase, "userId", "purchase request"),
    dep(Attempt, "userId", "attempt"),
  ],
};

/**
 * Returns a human-readable reason the record can't be deleted (e.g. "It is
 * used by 3 tests and 1 attempt."), or null if nothing references it.
 */
export async function findBlockingReferences(
  modelName: string,
  id: string,
): Promise<string | null> {
  const dependents = DEPENDENTS[modelName] ?? [];
  const counts = await Promise.all(
    dependents.map((d) => d.model.countDocuments({ [d.field]: id })),
  );

  const parts = dependents
    .map((d, i) => (counts[i] > 0 ? `${counts[i]} ${counts[i] === 1 ? d.singular : d.plural}` : null))
    .filter((p): p is string => p !== null);

  if (parts.length === 0) return null;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  const hint =
    modelName === "User"
      ? "Disable the account instead of deleting it."
      : "Remove or reassign them first.";
  return `Can't delete — it's used by ${list}. ${hint}`;
}
