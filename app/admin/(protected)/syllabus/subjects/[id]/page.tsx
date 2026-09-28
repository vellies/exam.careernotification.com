import { notFound } from "next/navigation";
import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Board } from "@/src/modules/syllabus/board.model";

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [item, parents] = await Promise.all([
    Subject.findById(id).lean(),
    Board.find().sort({ name: 1 }).lean(),
  ]);
  if (!item) notFound();

  return (
    <SimpleEntityForm
      title={`Edit ${item.name}`}
      resource="subjects"
      id={id}
      backHref="/admin/syllabus/subjects"
      initialValues={{
        // Tamil-only topics mirror the Tamil text into `name`; keep the English box empty for them.
        name: item.nameTa && item.name === item.nameTa ? "" : item.name,
        nameTa: item.nameTa ?? "",
        boardId: String(item.boardId),
        description: item.description ?? "",
        descriptionTa: item.descriptionTa ?? "",
        status: item.status,
      }}
      requireAnyOf={{ fields: ["name", "nameTa"], message: "Enter the name in English or Tamil" }}
      fields={[
        { kind: "text", name: "name", label: "Name (English)", placeholder: "e.g. Indian Polity" },
        { kind: "text", name: "nameTa", label: "Name (Tamil)", placeholder: "எ.கா. இந்திய அரசியல்" },
        { kind: "select", name: "boardId", label: "Subject", options: parents.map((p) => ({ value: String(p._id), label: p.name })) },
        { kind: "textarea", name: "description", label: "Description", placeholder: "Short description of this topic (optional)" },
        { kind: "textarea", name: "descriptionTa", label: "Description (Tamil)", placeholder: "இந்த தலைப்பின் சுருக்கமான விளக்கம் (விருப்பத்திற்குரியது)" },
        { kind: "select", name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
      ]}
    />
  );
}
