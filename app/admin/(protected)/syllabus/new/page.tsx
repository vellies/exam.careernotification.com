import { SimpleEntityForm } from "@/components/admin/simple-entity-form";

export default async function NewBoardPage() {
  return (
    <SimpleEntityForm
      title="New Board"
      resource="boards"
      backHref="/admin/syllabus"
      initialValues={{"name":"","nameTa":"","status":"active"}}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        { kind: "select", name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
      ]}
    />
  );
}
