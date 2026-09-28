import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Board } from "@/src/modules/syllabus/board.model";
import { Exam } from "@/src/modules/exams/exam.model";

export default async function EditBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Old links like /admin/syllabus/classes land here; show 404, not a cast error.
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const [item, exams] = await Promise.all([
    Board.findById(id).lean(),
    Exam.find().sort({ name: 1 }).lean(),
  ]);
  if (!item) notFound();

  return (
    <SimpleEntityForm
      title={`Edit ${item.name}`}
      resource="boards"
      id={id}
      backHref="/admin/syllabus"
      initialValues={{
        name: item.name,
        nameTa: item.nameTa ?? "",
        examId: item.examId ? String(item.examId) : "",
        status: item.status,
      }}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        { kind: "select", name: "examId", label: "Exam", placeholder: "Select an exam", options: exams.map((e) => ({ value: String(e._id), label: e.name })) },
        { kind: "select", name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
      ]}
    />
  );
}
