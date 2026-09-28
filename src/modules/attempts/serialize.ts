// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;

function orderOptions(options: AnyDoc[], optionOrder: string[]): AnyDoc[] {
  if (!optionOrder?.length) return options;
  const byId = new Map(options.map((o) => [o.id, o]));
  const ordered = optionOrder.map((id) => byId.get(id)).filter(Boolean);
  for (const o of options) {
    if (!optionOrder.includes(o.id)) ordered.push(o);
  }
  return ordered;
}

function sortedSnapshot(attempt: AnyDoc): AnyDoc[] {
  return attempt.questions.slice().sort((a: AnyDoc, b: AnyDoc) => a.order - b.order);
}

/** Sanitized payload for an in-progress attempt: never leaks correctAnswer/explanation. */
export function buildTakePayload(
  attempt: AnyDoc,
  test: AnyDoc,
  questionDocsById: Map<string, AnyDoc>,
) {
  const answersByQuestion = new Map(
    (attempt.answers ?? []).map((a: AnyDoc) => [String(a.questionId), a]),
  );

  return {
    attempt: {
      id: String(attempt._id),
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
    },
    test: {
      id: String(test._id),
      title: test.title,
      titleTa: test.titleTa,
      durationSeconds: test.durationSeconds,
      negativeMarking: test.negativeMarking,
      totalQuestions: attempt.questions.length,
      totalMarks: attempt.questions.reduce((sum: number, q: AnyDoc) => sum + q.marks, 0),
    },
    questions: sortedSnapshot(attempt).map((sq: AnyDoc) => {
      const q = questionDocsById.get(String(sq.questionId));
      const answer = answersByQuestion.get(String(sq.questionId)) as AnyDoc | undefined;
      return {
        questionId: String(sq.questionId),
        order: sq.order,
        marks: sq.marks,
        negativeMarks: sq.negativeMarks,
        type: q?.type,
        question: q?.question,
        options: orderOptions(q?.options ?? [], sq.optionOrder ?? []),
        selectedOptionId: answer?.selectedOptionId ?? null,
        flagged: answer?.flagged ?? false,
      };
    }),
  };
}

/** Full payload for a submitted attempt: includes the answer key + per-question scoring. */
export function buildResultPayload(
  attempt: AnyDoc,
  test: AnyDoc,
  questionDocsById: Map<string, AnyDoc>,
) {
  const resultsByQuestion = new Map(
    (attempt.results ?? []).map((r: AnyDoc) => [String(r.questionId), r]),
  );

  return {
    attempt: {
      id: String(attempt._id),
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      unattemptedCount: attempt.unattemptedCount,
    },
    test: {
      id: String(test._id),
      title: test.title,
      titleTa: test.titleTa,
    },
    questions: sortedSnapshot(attempt).map((sq: AnyDoc) => {
      const q = questionDocsById.get(String(sq.questionId));
      const result = resultsByQuestion.get(String(sq.questionId)) as AnyDoc | undefined;
      return {
        questionId: String(sq.questionId),
        order: sq.order,
        marks: sq.marks,
        negativeMarks: sq.negativeMarks,
        type: q?.type,
        question: q?.question,
        options: orderOptions(q?.options ?? [], sq.optionOrder ?? []),
        correctAnswer: q?.correctAnswer,
        explanation: q?.explanation,
        selectedOptionId: result?.selectedOptionId ?? null,
        isCorrect: result?.isCorrect ?? null,
        marksAwarded: result?.marksAwarded ?? 0,
      };
    }),
  };
}
