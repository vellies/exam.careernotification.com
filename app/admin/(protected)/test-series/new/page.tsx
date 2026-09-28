import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { Exam } from "@/src/modules/exams/exam.model";

export default async function NewTestSeriesPage() {
  await connectDB();
  const exams = await Exam.find().sort({ name: 1 }).lean();

  return (
    <SimpleEntityForm
      title="New Test Series"
      resource="test-series"
      backHref="/admin/test-series"
      initialValues={{
        title: "",
        titleTa: "",
        examId: "",
        description: "",
        descriptionTa: "",
        access: "free",
        price: 0,
        startDate: "",
        endDate: "",
        status: "draft",
      }}
      fields={[
        { kind: "text", name: "title", label: "Title", required: true },
        { kind: "text", name: "titleTa", label: "Title (Tamil)" },
        {
          kind: "select",
          name: "examId",
          label: "Exam",
          placeholder: "Select an exam",
          options: exams.map((e) => ({ value: String(e._id), label: e.name })),
        },
        { kind: "textarea", name: "description", label: "Description" },
        { kind: "textarea", name: "descriptionTa", label: "Description (Tamil)" },
        {
          kind: "select",
          name: "access",
          label: "Access",
          options: [
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
            { value: "subscription", label: "Subscription" },
          ],
        },
        { kind: "number", name: "price", label: "Price (₹, ignored when access is Free)" },
        {
          kind: "datetime",
          name: "startDate",
          label: "Start date & time",
          required: true,
          hint: "When this series (and every test in it) becomes available.",
        },
        {
          kind: "datetime",
          name: "endDate",
          label: "End date & time",
          required: true,
          hint: "When this series stops accepting new purchases and attempts. Must be after the start.",
        },
        {
          kind: "select",
          name: "status",
          label: "Status",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "archived", label: "Archived" },
          ],
        },
      ]}
    />
  );
}
