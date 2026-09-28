import { SimpleEntityForm } from "@/components/admin/simple-entity-form";

export default function NewExamCategoryPage() {
  return (
    <SimpleEntityForm
      title="New Exam Category"
      resource="exam-categories"
      backHref="/admin/exams/categories"
      initialValues={{ name: "", nameTa: "", status: "active", sortOrder: 0 }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true, placeholder: "TNPSC" },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
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
