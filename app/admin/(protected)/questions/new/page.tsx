import { QuestionForm } from "@/components/admin/question-form";
import { connectDB } from "@/src/lib/mongodb";
import { Subject } from "@/src/modules/syllabus/subject.model";

export default async function NewQuestionPage() {
  await connectDB();
  const subjects = await Subject.find().sort({ name: 1 }).lean();

  return (
    <QuestionForm
      initial={{
        type: "mcq_single",
        questionEn: "",
        questionTa: "",
        options: [
          { id: "A", text: { en: "", ta: "" } },
          { id: "B", text: { en: "", ta: "" } },
        ],
        correctAnswer: "",
        explanationEn: "",
        explanationTa: "",
        difficulty: "medium",
        subjectId: "",
        tags: "",
        status: "published",
      }}
      subjects={subjects.map((s) => ({ value: String(s._id), label: s.name }))}
    />
  );
}
