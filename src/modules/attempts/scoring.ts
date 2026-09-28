type SnapshotQuestion = {
  questionId: unknown;
  marks: number;
  negativeMarks: number;
};

type AnswerLike = {
  questionId: unknown;
  selectedOptionId?: string | null;
};

type QuestionDoc = {
  _id: unknown;
  correctAnswer: string;
};

export type ScoredResult = {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
};

export type ScoreSummary = {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  results: ScoredResult[];
};

/**
 * Pure scoring function — no DB access — so it can be unit-tested and reused
 * by both the finish endpoint and the defensive auto-expire path.
 */
export function scoreAttempt(
  snapshotQuestions: SnapshotQuestion[],
  answers: AnswerLike[],
  questionDocsById: Map<string, QuestionDoc>,
  negativeMarkingEnabled: boolean,
): ScoreSummary {
  const answersByQuestion = new Map(
    answers.map((a) => [String(a.questionId), a.selectedOptionId ?? null]),
  );

  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const results: ScoredResult[] = [];

  for (const sq of snapshotQuestions) {
    const questionId = String(sq.questionId);
    totalMarks += sq.marks;
    const selectedOptionId = answersByQuestion.get(questionId) ?? null;
    const questionDoc = questionDocsById.get(questionId);

    if (!selectedOptionId || !questionDoc) {
      unattemptedCount += 1;
      results.push({ questionId, selectedOptionId: null, isCorrect: null, marksAwarded: 0 });
      continue;
    }

    const isCorrect = selectedOptionId === questionDoc.correctAnswer;
    const effectiveNegativeMarks = negativeMarkingEnabled ? sq.negativeMarks : 0;

    if (isCorrect) {
      correctCount += 1;
      score += sq.marks;
      results.push({ questionId, selectedOptionId, isCorrect: true, marksAwarded: sq.marks });
    } else {
      wrongCount += 1;
      score -= effectiveNegativeMarks;
      results.push({
        questionId,
        selectedOptionId,
        isCorrect: false,
        marksAwarded: -effectiveNegativeMarks,
      });
    }
  }

  return { score, totalMarks, correctCount, wrongCount, unattemptedCount, results };
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
