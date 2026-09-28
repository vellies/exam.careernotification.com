import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ListChecks, Award, CircleCheck, PlayCircle, RotateCcw, CalendarClock, Lock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/page-loader";
import { connectDB } from "@/src/lib/mongodb";
import { getSession } from "@/src/lib/auth/session";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Test } from "@/src/modules/tests/test.model";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { formatDateTime } from "@/src/lib/datetime";

export const revalidate = 0;

export default async function SeriesTestsPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;

  return (
    <div>
      <Link
        href="/series"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to test series
      </Link>

      <Suspense fallback={<SectionLoader />}>
        <SeriesTests seriesId={seriesId} />
      </Suspense>
    </div>
  );
}

async function SeriesTests({ seriesId }: { seriesId: string }) {
  const session = await getSession();
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any = await TestSeries.findOne({ _id: seriesId, status: "published" })
    .populate("examId", "name")
    .lean()
    .catch(() => null);
  if (!series) notFound();

  const purchase = session
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((await Purchase.findOne({ userId: session.sub, testSeriesId: seriesId }).select("status").lean()) as any)
    : null;
  const hasAccess = series.access === "free" || purchase?.status === "paid";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tests, attempts]: [any[], any[]] = await Promise.all([
    Test.find({ status: "published", testSeriesId: series._id }).sort({ createdAt: 1 }).lean(),
    session ? Attempt.find({ userId: session.sub }).select("testId status score totalMarks").lean() : [],
  ]);
  const attemptByTestId = new Map(attempts.map((a) => [String(a.testId), a]));

  const now = Date.now();
  const seriesStartDate = series.startDate ? new Date(series.startDate) : null;
  const seriesEndDate = series.endDate ? new Date(series.endDate) : null;
  const seriesNotOpenYet = seriesStartDate ? now < seriesStartDate.getTime() : false;
  const seriesClosed = seriesEndDate ? now > seriesEndDate.getTime() : false;


  return (
    <>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{series.examId?.name}</p>
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{series.title}</h1>
      {series.titleTa ? <p className="text-sm text-muted-foreground">{series.titleTa}</p> : null}

      {tests.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No tests published in this series yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {tests.map((test) => {
            const totalMarks = test.questions?.reduce(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (sum: number, q: any) => sum + q.marks,
              0,
            );
            const attempt = attemptByTestId.get(String(test._id));
            const opensAt = test.opensAt ? new Date(test.opensAt) : null;
            const closesAt = test.closesAt ? new Date(test.closesAt) : null;
            const notOpenYet = opensAt && now < opensAt.getTime();
            const windowClosed = closesAt && now > closesAt.getTime() && !attempt;

            return (
              <div key={String(test._id)} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{test.title}</h3>
                  {test.titleTa ? <p className="text-xs text-muted-foreground">{test.titleTa}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {Math.round(test.durationSeconds / 60)} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3.5" />
                      {test.questions?.length ?? 0} questions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Award className="size-3.5" />
                      {totalMarks} marks
                    </span>
                    {opensAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Opens {formatDateTime(opensAt)}
                      </span>
                    ) : null}
                    {closesAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Closes {formatDateTime(closesAt)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {!hasAccess ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" />{" "}
                    {purchase?.status === "pending" ? "Pending approval" : "Purchase required"}
                  </Badge>
                ) : attempt?.status === "submitted" ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <CircleCheck className="size-3.5" />
                      {attempt.score} / {attempt.totalMarks}
                    </Badge>
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/my-results/${String(attempt._id)}`}>View result</Link>}
                    />
                  </div>
                ) : attempt?.status === "in_progress" ? (
                  <Button
                    nativeButton={false}
                    render={
                      <Link href={`/tests/${String(test._id)}/attempt`}>
                        <RotateCcw className="size-4" /> Resume
                      </Link>
                    }
                  />
                ) : seriesNotOpenYet ? (
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3.5" /> Series not open yet
                  </Badge>
                ) : seriesClosed ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" /> Series closed
                  </Badge>
                ) : notOpenYet ? (
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3.5" /> Not open yet
                  </Badge>
                ) : windowClosed ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" /> Closed
                  </Badge>
                ) : (
                  <Button
                    nativeButton={false}
                    render={
                      <Link href={`/tests/${String(test._id)}/attempt`}>
                        <PlayCircle className="size-4" /> Start test
                      </Link>
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
