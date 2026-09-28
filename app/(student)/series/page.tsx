import { Suspense } from "react";
import Link from "next/link";
import { ListChecks, CircleCheck, CalendarClock, Lock, Hourglass, CircleX, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchaseButton } from "@/components/student/purchase-button";
import { SectionLoader } from "@/components/shared/page-loader";
import { connectDB } from "@/src/lib/mongodb";
import { getSession } from "@/src/lib/auth/session";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Test } from "@/src/modules/tests/test.model";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { formatDateTime } from "@/src/lib/datetime";

export const revalidate = 0;

export default function MyTestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Tests</h1>
      <p className="mt-2 text-muted-foreground">
        All test series. One purchase unlocks every test in a series — find your purchased series under My Tests.
      </p>

      <Suspense fallback={<SectionLoader />}>
        <SeriesList />
      </Suspense>
    </div>
  );
}

async function SeriesList() {
  const session = await getSession();
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesList: any[] = await TestSeries.find({ status: "published" })
    .populate("examId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tests, purchases]: [any[], any[]] = await Promise.all([
    Test.find({ status: "published", testSeriesId: { $in: seriesList.map((s) => s._id) } })
      .select("testSeriesId")
      .lean(),
    session ? Purchase.find({ userId: session.sub }).select("testSeriesId status").lean() : [],
  ]);

  const purchaseBySeriesId = new Map(purchases.map((p) => [String(p.testSeriesId), p]));
  const testCountBySeriesId = new Map<string, number>();
  for (const test of tests) {
    const key = String(test.testSeriesId);
    testCountBySeriesId.set(key, (testCountBySeriesId.get(key) ?? 0) + 1);
  }
  const now = Date.now();

  const seriesWithTests = seriesList.filter((s) => (testCountBySeriesId.get(String(s._id)) ?? 0) > 0);

  return (
    <>
      {seriesWithTests.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No tests published yet — check back soon.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {seriesWithTests.map((series) => {
            const id = String(series._id);
            const purchase = purchaseBySeriesId.get(id);
            const hasAccess = series.access === "free" || purchase?.status === "paid";
            const testCount = testCountBySeriesId.get(id) ?? 0;
            const seriesStartDate = series.startDate ? new Date(series.startDate) : null;
            const seriesEndDate = series.endDate ? new Date(series.endDate) : null;
            const seriesNotOpenYet = seriesStartDate ? now < seriesStartDate.getTime() : false;
            const seriesClosed = seriesEndDate ? now > seriesEndDate.getTime() : false;

            return (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"
              >
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{series.examId?.name}</p>
                  <h2 className="mt-0.5 text-base font-bold tracking-tight">{series.title}</h2>
                  {series.titleTa ? <p className="text-sm text-muted-foreground">{series.titleTa}</p> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3.5" />
                      {testCount} {testCount === 1 ? "test" : "tests"}
                    </span>
                    {seriesStartDate ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Opens {formatDateTime(seriesStartDate)}
                      </span>
                    ) : null}
                    {seriesEndDate ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Closes {formatDateTime(seriesEndDate)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {seriesNotOpenYet ? (
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3.5" /> Not open yet
                  </Badge>
                ) : seriesClosed ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" /> Closed
                  </Badge>
                ) : hasAccess ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <CircleCheck className="size-3.5" /> {series.access === "free" ? "Free" : "Purchased"}
                    </Badge>
                    <Button
                      nativeButton={false}
                      render={
                        <Link href={`/series/${id}`}>
                          View tests <ArrowRight className="size-4" />
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link href={`/series/${id}`}>
                          View tests <ArrowRight className="size-4" />
                        </Link>
                      }
                    />
                    {purchase?.status === "pending" ? (
                      <Badge variant="outline" className="gap-1">
                        <Hourglass className="size-3.5" /> Pending admin approval
                      </Badge>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        {purchase?.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <CircleX className="size-3.5" /> Request declined
                          </span>
                        ) : null}
                        <PurchaseButton
                          testSeriesId={id}
                          price={series.price ?? 0}
                          seriesTitle={series.title}
                          rejected={purchase?.status === "rejected"}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
