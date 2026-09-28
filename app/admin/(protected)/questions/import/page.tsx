import { QuestionBulkImportForm } from "@/components/admin/question-bulk-import-form";
import { connectDB } from "@/src/lib/mongodb";
import { Subject } from "@/src/modules/syllabus/subject.model";

export default async function ImportQuestionsPage() {
  await connectDB();
  const subjects = await Subject.find().sort({ name: 1 }).lean();

  return (
    <QuestionBulkImportForm
      subjects={subjects.map((s) => ({ value: String(s._id), label: s.name }))}
    />
  );
}
