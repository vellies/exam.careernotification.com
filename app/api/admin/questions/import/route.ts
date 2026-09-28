import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import {
  parseJsonQuestion,
  questionBulkImportSchema,
  type QuestionImportItem,
} from "@/src/modules/questions/schemas";

const MAX_ERRORS = 25;

/**
 * Bulk-creates question bank entries from pasted JSON. The JSON carries only
 * content; type, difficulty, subject, tags and status come from the form.
 * All-or-nothing: one invalid question means nothing is saved.
 */
export async function POST(request: Request) {
  const guard = await requirePermission("questions", "create");
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  const parsed = questionBulkImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { questions, type, difficulty, subjectId, tags, status, language } = parsed.data;

  const errors: string[] = [];
  const items: QuestionImportItem[] = [];
  questions.forEach((raw, i) => {
    const result = parseJsonQuestion(raw, { type, difficulty, tags, language });
    if (result.ok) items.push(result.data);
    else errors.push(...result.errors.map((e) => `Question ${i + 1} — ${e}`));
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: `${errors.length} problem${errors.length === 1 ? "" : "s"} found — nothing was saved`,
        errors: errors.slice(0, MAX_ERRORS),
        more: Math.max(0, errors.length - MAX_ERRORS),
      },
      { status: 400 },
    );
  }

  await connectDB();

  if (subjectId && (!isValidObjectId(subjectId) || !(await Subject.exists({ _id: subjectId })))) {
    return NextResponse.json({ error: "Topic not found" }, { status: 400 });
  }

  const created = await Question.insertMany(
    items.map((q) => ({
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      subjectId,
      tags: q.tags,
      status,
    })),
  );

  return NextResponse.json({ added: created.length }, { status: 201 });
}
