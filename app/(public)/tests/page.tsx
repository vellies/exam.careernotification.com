import { Suspense } from "react";
import Link from "next/link";
import { Clock, ListChecks } from "lucide-react";
import { SectionLoader } from "@/components/shared/page-loader";
import { PageShell, ComingSoon } from "@/components/shared/page-shell";
import { connectDB } from "@/src/lib/mongodb";
import { Test } from "@/src/modules/tests/test.model";

export const revalidate = 0;

export default function TestsPage() {
  return (
    <PageShell
      eyebrow="Practice"
      title="Tests"
      description="Individual mock tests, chapter tests and daily quizzes."
    >
      <Suspense fallback={<SectionLoader />}>
        <TestsGrid />
      </Suspense>
    </PageShell>
  );
}

async function TestsGrid() {
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: any[] = await Test.find({ status: "published" })
    .populate("testSeriesId", "title slug")
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return (
    <>
      {tests.length === 0 ? (
        <ComingSoon label="Test listing" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Link
              key={String(test._id)}
              href={`/test-series/${test.testSeriesId?.slug}`}
              className="flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {test.testSeriesId?.title}
              </p>
              <h2 className="mt-1 text-base font-bold tracking-tight">{test.title}</h2>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {Math.round(test.durationSeconds / 60)} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3.5" />
                  {test.questions?.length ?? 0} questions
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
