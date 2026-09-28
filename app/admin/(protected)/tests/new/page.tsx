import { TestForm } from "@/components/admin/test-form";
import { connectDB } from "@/src/lib/mongodb";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { toDatetimeLocal } from "@/src/lib/datetime";

export default async function NewTestPage({
  searchParams,
}: {
  searchParams: Promise<{ testSeriesId?: string }>;
}) {
  const { testSeriesId } = await searchParams;
  await connectDB();
  const series = await TestSeries.find().sort({ title: 1 }).lean();
  const options = series.map((s) => ({
    value: String(s._id),
    label: s.title,
    endDate: toDatetimeLocal(s.endDate),
  }));
  const preselected = options.find((o) => o.value === testSeriesId);

  return (
    <TestForm
      backHref={testSeriesId ? `/admin/tests?testSeriesId=${testSeriesId}` : "/admin/tests"}
      testSeriesOptions={options}
      initial={{
        title: "",
        titleTa: "",
        testSeriesId: testSeriesId ?? "",
        durationSeconds: 3600,
        negativeMarking: true,
        defaultNegativeMarks: 0.25,
        shuffleQuestions: false,
        shuffleOptions: true,
        opensAt: "",
        closesAt: preselected?.endDate ?? "",
        status: "draft",
      }}
    />
  );
}
