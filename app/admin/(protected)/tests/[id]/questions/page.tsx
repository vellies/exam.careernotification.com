import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Clock, ListChecks } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { TestQuestionBuilder } from "@/components/admin/test-question-builder";
import { connectDB } from "@/src/lib/mongodb";
import { Test } from "@/src/modules/tests/test.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Board } from "@/src/modules/syllabus/board.model";

export default async function TestQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const [test, boards, subjects] = await Promise.all([
    Test.findById(id).populate("questions.questionId").lean(),
    Board.find({ status: "active" }).select("name nameTa").sort({ name: 1 }).lean(),
    Subject.find({ status: "active" }).select("name nameTa boardId").sort({ name: 1 }).lean(),
  ]);
  if (!test) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any = await TestSeries.findById(test.testSeriesId).populate("examId", "name").lean();
  const fmt = (d: Date | string | null | undefined) =>
    d
      ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "Not set";

  return (
    <div>
      <Link
        href={`/admin/tests?testSeriesId=${String(test.testSeriesId)}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to {series?.title ?? "series"} tests
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{test.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage which questions appear in this test.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{series?.title ?? "—"}</span>
          {series?.examId?.name ? ` · ${series.examId.name}` : ""}
        </span>
        <span
          className="inline-flex items-center gap-1"
          title={`Series window: ${fmt(series?.startDate)} → ${series?.endDate ? fmt(series.endDate) : "No end"}`}
        >
          <CalendarClock className="size-3.5" />
          <span className="font-medium text-foreground">{fmt(test.opensAt)}</span>
          →
          <span className="font-medium text-foreground">{fmt(test.closesAt)}</span>
        </span>
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{Math.round(test.durationSeconds / 60)} min</span>
        <span className="inline-flex items-center gap-1"><ListChecks className="size-3.5" />{test.questions?.length ?? 0} questions</span>
        <StatusBadge status={test.status} />
      </div>

      <TestQuestionBuilder
        testId={id}
        attached={JSON.parse(JSON.stringify(test.questions))}
        shuffleQuestions={Boolean(test.shuffleQuestions)}
        syllabus={{
          boards: JSON.parse(JSON.stringify(boards)),
          subjects: JSON.parse(JSON.stringify(subjects)),
        }}
      />
    </div>
  );
}
