import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLoader } from "@/components/shared/page-loader";
import { PageShell, ComingSoon } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { connectDB } from "@/src/lib/mongodb";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Exam } from "@/src/modules/exams/exam.model";

export const revalidate = 0;

export default async function TestSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examSlug } = await searchParams;

  return (
    <PageShell
      eyebrow="Practice"
      title="Test Series"
      description="Free and premium mock test series built from versioned exam blueprints."
    >
      <Suspense fallback={<SectionLoader />}>
        <SeriesGrid key={examSlug} examSlug={examSlug} />
      </Suspense>
    </PageShell>
  );
}

async function SeriesGrid({ examSlug }: { examSlug?: string }) {
  await connectDB();

  const filter: Record<string, unknown> = { status: "published" };
  if (examSlug) {
    const exam = await Exam.findOne({ slug: examSlug }).lean();
    filter.examId = exam?._id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = await TestSeries.find(filter)
    .populate("examId", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <>
      {series.length === 0 ? (
        <ComingSoon label="Test series listing" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((item) => (
            <Link
              key={String(item._id)}
              href={`/test-series/${item.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold tracking-tight">{item.title}</h2>
                <Badge variant={item.access === "free" ? "secondary" : "default"}>
                  {item.access}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.examId?.name}</p>
              {item.description ? (
                <p className="mt-3 line-clamp-2 text-sm text-foreground/70">
                  {item.description}
                </p>
              ) : null}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                View tests
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
