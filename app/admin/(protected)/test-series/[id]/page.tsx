import { notFound } from "next/navigation";
import { SimpleEntityForm } from "@/components/admin/simple-entity-form";
import { connectDB } from "@/src/lib/mongodb";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Exam } from "@/src/modules/exams/exam.model";
import { toDatetimeLocal } from "@/src/lib/datetime";

export default async function EditTestSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [item, exams] = await Promise.all([
    TestSeries.findById(id).lean(),
    Exam.find().sort({ name: 1 }).lean(),
  ]);
  if (!item) notFound();

  return (
    <SimpleEntityForm
      title={`Edit ${item.title}`}
      resource="test-series"
      id={id}
      backHref="/admin/test-series"
      initialValues={{
        title: item.title,
        titleTa: item.titleTa ?? "",
        examId: String(item.examId),
        description: item.description ?? "",
        descriptionTa: item.descriptionTa ?? "",
        access: item.access,
        price: item.price ?? 0,
        startDate: toDatetimeLocal(item.startDate),
        endDate: toDatetimeLocal(item.endDate),
        status: item.status,
      }}
      fields={[
        { kind: "text", name: "title", label: "Title", required: true },
        { kind: "text", name: "titleTa", label: "Title (Tamil)" },
        {
          kind: "select",
          name: "examId",
          label: "Exam",
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
