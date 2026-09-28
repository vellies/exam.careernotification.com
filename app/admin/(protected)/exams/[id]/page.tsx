import { notFound } from "next/navigation";
import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Exam } from "@/src/modules/exams/exam.model";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [exam, categories] = await Promise.all([
    Exam.findById(id).lean(),
    ExamCategory.find().sort({ name: 1 }).lean(),
  ]);
  if (!exam) notFound();

  return (
    <SimpleEntityForm
      title={`Edit ${exam.name}`}
      resource="exams"
      id={id}
      backHref="/admin/exams"
      initialValues={{
        name: exam.name,
        nameTa: exam.nameTa ?? "",
        examCategoryId: String(exam.examCategoryId),
        description: exam.description ?? "",
        descriptionTa: exam.descriptionTa ?? "",
        status: exam.status,
      }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        {
          kind: "select",
          name: "examCategoryId",
          label: "Category",
          options: categories.map((c) => ({ value: String(c._id), label: c.name })),
        },
        { kind: "textarea", name: "description", label: "Description" },
        { kind: "textarea", name: "descriptionTa", label: "Description (Tamil)" },
        {
          kind: "select",
          name: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
      ]}
    />
  );
}
