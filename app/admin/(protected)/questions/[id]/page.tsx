import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/question-form";
import { connectDB } from "@/src/lib/mongodb";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [item, subjects] = await Promise.all([
    Question.findById(id).lean(),
    Subject.find().sort({ name: 1 }).lean(),
  ]);
  if (!item) notFound();

  return (
    <QuestionForm
      id={id}
      initial={{
        type: item.type,
        questionEn: item.question?.en ?? "",
        questionTa: item.question?.ta ?? "",
        options: item.options?.length
          ? item.options
          : [
              { id: "A", text: { en: "", ta: "" } },
              { id: "B", text: { en: "", ta: "" } },
            ],
        correctAnswer: item.correctAnswer,
        explanationEn: item.explanation?.en ?? "",
        explanationTa: item.explanation?.ta ?? "",
        difficulty: item.difficulty,
        subjectId: item.subjectId ? String(item.subjectId) : "",
        tags: (item.tags ?? []).join(", "),
        status: item.status,
      }}
      subjects={subjects.map((s) => ({ value: String(s._id), label: s.name }))}
    />
  );
}
