import { notFound } from "next/navigation";
import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import { EXAM_CATEGORY_TYPES } from "@/src/modules/exams/category-types";

export default async function EditExamCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const category = await ExamCategory.findById(id).lean();
  if (!category) notFound();

  return (
    <SimpleEntityForm
      title={`Edit ${category.name}`}
      resource="exam-categories"
      id={id}
      backHref="/admin/exams/categories"
      initialValues={{
        name: category.name,
        nameTa: category.nameTa ?? "",
        type: category.type ?? "others",
        status: category.status,
        sortOrder: category.sortOrder ?? 0,
      }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        {
          kind: "select",
          name: "type",
          label: "Type",
          options: EXAM_CATEGORY_TYPES.map((t) => ({ value: t.value, label: t.label })),
        },
        { kind: "number", name: "sortOrder", label: "Sort order" },
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
