import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";

export default async function NewExamPage() {
  await connectDB();
  const categories = await ExamCategory.find().sort({ name: 1 }).lean();

  return (
    <SimpleEntityForm
      title="New Exam"
      resource="exams"
      backHref="/admin/exams"
      initialValues={{ name: "", nameTa: "", examCategoryId: "", description: "", descriptionTa: "", status: "active" }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true, placeholder: "TNPSC Group 4" },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        {
          kind: "select",
          name: "examCategoryId",
          label: "Category",
          placeholder: "Select a category",
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
