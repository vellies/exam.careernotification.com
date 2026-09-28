import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/src/lib/mongodb";
import { requireAdmin, requirePermission } from "@/src/lib/auth/guard";
import { Question } from "@/src/modules/questions/question.model";
import { Test } from "@/src/modules/tests/test.model";
import { Attempt } from "@/src/modules/attempts/attempt.model";

const ids = z
  .array(z.string().refine((id) => Types.ObjectId.isValid(id), "Invalid question ID"))
  .min(1, "Select at least one question")
  .max(500, "Select at most 500 questions at a time");

const bulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), ids, status: z.enum(["draft", "published", "archived"]) }),
  z.object({ action: z.literal("delete"), ids }),
]);

/**
 * Bulk actions on selected question bank entries: change status, or delete.
 * Deleting skips questions a test or attempt still references (same rule as
 * the single delete) and deletes the rest.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const denied = await requirePermission("questions", data.action === "delete" ? "delete" : "update");
  if (denied) return denied;

  await connectDB();

  if (data.action === "status") {
    const result = await Question.updateMany({ _id: { $in: data.ids } }, { status: data.status });
    return NextResponse.json({ updated: result.modifiedCount, matched: result.matchedCount });
  }

  const [inTests, inAttempts] = await Promise.all([
    Test.distinct("questions.questionId", { "questions.questionId": { $in: data.ids } }),
    Attempt.distinct("questions.questionId", { "questions.questionId": { $in: data.ids } }),
  ]);
  const used = new Set([...inTests, ...inAttempts].map(String));
  const deletable = data.ids.filter((id) => !used.has(id));

  const result = deletable.length
    ? await Question.deleteMany({ _id: { $in: deletable } })
    : { deletedCount: 0 };

  return NextResponse.json({
    deleted: result.deletedCount,
    skipped: data.ids.filter((id) => used.has(id)).length,
  });
}
