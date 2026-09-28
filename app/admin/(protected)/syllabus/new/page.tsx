import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Exam } from "@/src/modules/exams/exam.model";

export default async function NewBoardPage() {
  await connectDB();
  const exams = await Exam.find().sort({ name: 1 }).lean();

  return (
    <SimpleEntityForm
      title="New Subject"
      resource="boards"
      backHref="/admin/syllabus"
      initialValues={{"name":"","nameTa":"","examId":"","status":"active"}}
      fields={[
        { kind: "text", name: "name", label: "Name", required: true },
        { kind: "text", name: "nameTa", label: "Name (Tamil)" },
        { kind: "select", name: "examId", label: "Exam", placeholder: "Select an exam", options: exams.map((e) => ({ value: String(e._id), label: e.name })) },
        { kind: "select", name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
      ]}
    />
  );
}
