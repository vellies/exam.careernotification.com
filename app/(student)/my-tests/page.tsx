import { Suspense } from "react";
import Link from "next/link";
import { ListChecks, CircleCheck, CalendarClock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/page-loader";
import { connectDB } from "@/src/lib/mongodb";
import { getSession } from "@/src/lib/auth/session";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Test } from "@/src/modules/tests/test.model";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { formatDateTime } from "@/src/lib/datetime";

export const revalidate = 0;

export default function PurchasedTestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">My Tests</h1>
      <p className="mt-2 text-muted-foreground">Test series you have purchased.</p>

      <Suspense fallback={<SectionLoader />}>
        <PurchasedTestsList />
      </Suspense>
    </div>
  );
}

async function PurchasedTestsList() {
  const session = await getSession();
  await connectDB();

  const purchases = session
    ? await Purchase.find({ userId: session.sub, status: "paid" }).select("testSeriesId").lean()
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesList: any[] = await TestSeries.find({
    status: "published",
    _id: { $in: purchases.map((p) => p.testSeriesId) },
  })
    .populate("examId", "name")
    .sort({ createdAt: 1 })
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: any[] = await Test.find({
    status: "published",
    testSeriesId: { $in: seriesList.map((s) => s._id) },
  })
    .select("testSeriesId")
    .lean();

  const testCountBySeriesId = new Map<string, number>();
  for (const test of tests) {
    const key = String(test.testSeriesId);
    testCountBySeriesId.set(key, (testCountBySeriesId.get(key) ?? 0) + 1);
  }
  const now = Date.now();

  return (
    <>
      {seriesList.length === 0 ? (
        <div className="mt-8 text-sm text-muted-foreground">
          <p>You haven&apos;t purchased any test series yet.</p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={<Link href="/series">Browse tests</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {seriesList.map((series) => {
            const id = String(series._id);
            const testCount = testCountBySeriesId.get(id) ?? 0;
            const startDate = series.startDate ? new Date(series.startDate) : null;
            const endDate = series.endDate ? new Date(series.endDate) : null;
            const notOpenYet = startDate ? now < startDate.getTime() : false;
            const closed = endDate ? now > endDate.getTime() : false;

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
                    {startDate ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Opens {formatDateTime(startDate)}
                      </span>
                    ) : null}
                    {endDate ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        Closes {formatDateTime(endDate)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <CircleCheck className="size-3.5" /> Purchased
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
