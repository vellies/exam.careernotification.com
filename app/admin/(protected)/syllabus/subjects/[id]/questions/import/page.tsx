import { notFound, redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { QuestionBulkImportForm } from "@/components/admin/question-bulk-import-form";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can } from "@/src/lib/auth/permissions";
import { connectDB } from "@/src/lib/mongodb";
import { Subject } from "@/src/modules/syllabus/subject.model";

export default async function ImportTopicQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, access] = await Promise.all([params, getAdminAccess()]);
  if (!isValidObjectId(id)) notFound();
  if (!can(access, "questions", "create")) redirect(`/admin/syllabus/subjects/${id}/questions`);

  await connectDB();
  const topic = await Subject.findById(id).select("name").lean();
  if (!topic) notFound();

  return <QuestionBulkImportForm subjects={[]} topic={{ id, name: topic.name }} />;
}
