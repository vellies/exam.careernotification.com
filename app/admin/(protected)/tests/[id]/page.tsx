import { notFound } from "next/navigation";
import { TestForm } from "@/components/admin/test-form";
import { connectDB } from "@/src/lib/mongodb";
import { Test } from "@/src/modules/tests/test.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { toDatetimeLocal } from "@/src/lib/datetime";

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [item, series] = await Promise.all([
    Test.findById(id).lean(),
    TestSeries.find().sort({ title: 1 }).lean(),
  ]);
  if (!item) notFound();

  return (
    <TestForm
      id={id}
      backHref={`/admin/tests?testSeriesId=${String(item.testSeriesId)}`}
      testSeriesOptions={series.map((s) => ({ value: String(s._id), label: s.title }))}
      initial={{
        title: item.title,
        titleTa: item.titleTa ?? "",
        testSeriesId: String(item.testSeriesId),
        durationSeconds: item.durationSeconds,
        negativeMarking: item.negativeMarking,
        defaultNegativeMarks: item.defaultNegativeMarks,
        shuffleQuestions: item.shuffleQuestions,
        shuffleOptions: item.shuffleOptions,
        opensAt: toDatetimeLocal(item.opensAt),
        closesAt: toDatetimeLocal(item.closesAt),
        status: item.status,
      }}
    />
  );
}
