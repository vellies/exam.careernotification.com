import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import { Test } from "@/src/modules/tests/test.model";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { importTestQuestionsSchema } from "@/src/modules/tests/schemas";
import {
  questionImportItemSchema,
  type QuestionImportItem,
} from "@/src/modules/questions/schemas";

type Context = { params: Promise<{ id: string }> };

const MAX_ERRORS = 25;

/**
 * Creates questions from an uploaded JSON array and appends them to the test.
 * All-or-nothing: if any question is invalid nothing is saved, and every
 * problem is reported by question number so the admin can fix the file.
 * Imported questions are published into the question bank so they can be
 * reused by other tests and auto-fill.
 */
export async function POST(request: Request, { params }: Context) {
  const guard =
    (await requirePermission("tests", "update")) ?? (await requirePermission("questions", "create"));
  if (guard) return guard;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = importTestQuestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const errors: string[] = [];
  const items: QuestionImportItem[] = [];
  parsed.data.questions.forEach((raw, i) => {
    const result = questionImportItemSchema.safeParse(raw);
    if (result.success) {
      items.push(result.data);
      return;
    }
    for (const issue of result.error.issues) {
      const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
      errors.push(`Question ${i + 1} — ${field}${issue.message}`);
    }
  });

  await connectDB();

  const test = await Test.findById(id);
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  // Resolve subject names / slugs / IDs to subject IDs.
  const subjects = await Subject.find()
    .select("name slug")
    .lean<{ _id: mongoose.Types.ObjectId; name: string; slug: string }[]>();
  const subjectByKey = new Map<string, string>();
  for (const s of subjects) {
    subjectByKey.set(String(s._id), String(s._id));
    subjectByKey.set(s.name.toLowerCase(), String(s._id));
    subjectByKey.set(s.slug.toLowerCase(), String(s._id));
  }

  const defaultSubjectId = parsed.data.subjectId;
  if (defaultSubjectId && !subjectByKey.has(defaultSubjectId)) {
    return NextResponse.json({ error: "Default topic not found" }, { status: 400 });
  }

  const resolvedSubjects = parsed.data.questions.map((raw, i) => {
    const subject = (raw as { subject?: unknown })?.subject;
    if (typeof subject !== "string" || !subject.trim()) return defaultSubjectId;
    const match = subjectByKey.get(subject.trim()) ?? subjectByKey.get(subject.trim().toLowerCase());
    if (!match) errors.push(`Question ${i + 1} — topic: "${subject}" not found`);
    return match;
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: `${errors.length} problem${errors.length === 1 ? "" : "s"} found — nothing was imported`,
        errors: errors.slice(0, MAX_ERRORS),
        more: Math.max(0, errors.length - MAX_ERRORS),
      },
      { status: 400 },
    );
  }

  const created = await Question.insertMany(
    items.map((q, i) => ({
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      subjectId: resolvedSubjects[i],
      tags: q.tags,
      status: "published",
    })),
  );

  let nextOrder = test.questions.length + 1;
  created.forEach((doc, i) => {
    test.questions.push({
      questionId: doc._id,
      order: nextOrder++,
      marks: items[i].marks ?? parsed.data.marks,
      negativeMarks: items[i].negativeMarks ?? parsed.data.negativeMarks,
    });
  });

  try {
    await test.save();
  } catch (err) {
    // Don't leave orphaned questions behind if attaching them fails.
    await Question.deleteMany({ _id: { $in: created.map((d) => d._id) } });
    throw err;
  }

  return NextResponse.json({ added: created.length, item: test }, { status: 201 });
}
