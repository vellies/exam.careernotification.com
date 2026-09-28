import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { EXAM_CATEGORY_TYPES } from "@/src/modules/exams/category-types";

export default function NewExamCategoryPage() {
  return (
    <SimpleEntityForm
      title="New Exam Category"
      resource="exam-categories"
      backHref="/admin/exams/categories"
      initialValues={{ name: "", nameTa: "", type: "state_government", status: "active", sortOrder: 0 }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true, placeholder: "TNPSC" },
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
