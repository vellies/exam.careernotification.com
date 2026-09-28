import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Board } from "@/src/modules/syllabus/board.model";

export default async function NewSubjectPage() {
  await connectDB();
  const parents = await Board.find().sort({ name: 1 }).lean();

  return (
    <SimpleEntityForm
      title="New Topic"
      resource="subjects"
      backHref="/admin/syllabus/subjects"
      initialValues={{"name":"","nameTa":"","status":"active","boardId":"","description":"","descriptionTa":""}}
      requireAnyOf={{ fields: ["name", "nameTa"], message: "Enter the name in English or Tamil" }}
      fields={[
        { kind: "text", name: "name", label: "Name (English)", placeholder: "e.g. Indian Polity" },
        { kind: "text", name: "nameTa", label: "Name (Tamil)", placeholder: "எ.கா. இந்திய அரசியல்" },
        { kind: "select", name: "boardId", label: "Subject", placeholder: "Select a subject", options: parents.map((p) => ({ value: String(p._id), label: p.name })) },
        { kind: "textarea", name: "description", label: "Description", placeholder: "Short description of this topic (optional)" },
        { kind: "textarea", name: "descriptionTa", label: "Description (Tamil)", placeholder: "இந்த தலைப்பின் சுருக்கமான விளக்கம் (விருப்பத்திற்குரியது)" },
        { kind: "select", name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
      ]}
    />
  );
}
