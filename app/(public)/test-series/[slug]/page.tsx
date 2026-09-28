import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ListChecks, Award, CalendarClock, Lock, Hourglass } from "lucide-react";
import { PageShell, ComingSoon } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { PurchaseButton } from "@/components/student/purchase-button";
import { connectDB } from "@/src/lib/mongodb";
import { getSession } from "@/src/lib/auth/session";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Test } from "@/src/modules/tests/test.model";
import { Purchase } from "@/src/modules/payments/purchase.model";

export const revalidate = 0;

export default async function TestSeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  await connectDB();

  const series = await TestSeries.findOne({ slug, status: "published" })
    .populate("examId", "name")
    .lean();
  if (!series) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tests, purchase]: [any[], any] = await Promise.all([
    Test.find({ testSeriesId: series._id, status: "published" })
      .sort({ createdAt: 1 })
      .lean(),
    session
      ? Purchase.findOne({ userId: session.sub, testSeriesId: series._id }).lean()
      : null,
  ]);

  const hasAccess = series.access === "free" || purchase?.status === "paid";
  const isPending = purchase?.status === "pending";
  const isRejected = purchase?.status === "rejected";
  const now = Date.now();
  const seriesStartDate = series.startDate ? new Date(series.startDate) : null;
  const seriesEndDate = series.endDate ? new Date(series.endDate) : null;
  const seriesNotOpenYet = seriesStartDate ? now < seriesStartDate.getTime() : false;
  const seriesClosed = seriesEndDate ? now > seriesEndDate.getTime() : false;

  return (
    <PageShell
      eyebrow={(series.examId as { name?: string })?.name ?? "Test Series"}
      title={series.title}
      description={series.description || undefined}
    >
      {series.access !== "free" || seriesStartDate || seriesEndDate ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">
              {seriesNotOpenYet
                ? `This series opens on ${seriesStartDate!.toLocaleString()}`
                : seriesClosed
                  ? "This series is no longer available"
                  : hasAccess
                    ? "You have access to this series"
                    : isPending
                      ? "Your request is awaiting admin approval"
                      : isRejected
                        ? "Your last request was declined"
                        : series.access === "free"
                          ? "Free"
                          : `This is a paid series — ₹${series.price ?? 0}`}
            </p>
            <p className="text-xs text-muted-foreground">
              One approved request unlocks every test in this series.
              {seriesEndDate && !seriesClosed
                ? ` Available until ${seriesEndDate.toLocaleString()}.`
                : ""}
            </p>
          </div>
          {seriesNotOpenYet ? (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="size-3.5" /> Not open yet
            </Badge>
          ) : seriesClosed ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3.5" /> Closed
            </Badge>
          ) : series.access === "free" ? null : isPending ? (
            <Badge variant="outline" className="gap-1">
              <Hourglass className="size-3.5" /> Pending admin approval
            </Badge>
          ) : !hasAccess && session ? (
            <PurchaseButton
              testSeriesId={String(series._id)}
              price={series.price ?? 0}
              seriesTitle={series.title}
              rejected={isRejected}
            />
          ) : !hasAccess ? (
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Sign in to purchase
            </Link>
          ) : null}
        </div>
      ) : null}

      {tests.length === 0 ? (
        <ComingSoon label="Tests in this series" />
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const opensAt = test.opensAt ? new Date(test.opensAt) : null;
            const closesAt = test.closesAt ? new Date(test.closesAt) : null;
            const notOpenYet = opensAt && now < opensAt.getTime();
            const windowClosed = closesAt && now > closesAt.getTime();

            return (
              <div
                key={String(test._id)}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div>
                  <h2 className="text-base font-bold tracking-tight">{test.title}</h2>
                  {test.titleTa ? (
                    <p className="text-sm text-muted-foreground">{test.titleTa}</p>
                  ) : null}
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
                      {test.questions?.reduce(
                        (sum: number, q: { marks: number }) => sum + q.marks,
                        0,
                      ) ?? 0}{" "}
                      marks
                    </span>
                    {opensAt || closesAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        {notOpenYet
                          ? `Opens ${opensAt!.toLocaleString()}`
                          : closesAt
                            ? `Closes ${closesAt.toLocaleString()}`
                            : null}
                      </span>
                    ) : null}
                  </div>
                </div>

                {seriesNotOpenYet ? (
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="size-3.5" /> Series not open yet
                  </Badge>
                ) : seriesClosed ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" /> Series closed
                  </Badge>
                ) : !hasAccess && isPending ? (
                  <Badge variant="outline" className="gap-1">
                    <Hourglass className="size-3.5" /> Pending approval
                  </Badge>
                ) : !hasAccess ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3.5" /> Access required
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
                  <Link
                    href={`/tests/${String(test._id)}/attempt`}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                  >
                    Start test
                  </Link>
                )}
              </div>
            );
          })}
          {!session ? (
            <p className="pt-4 text-center text-xs text-muted-foreground">
              Not signed in yet?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create a free account
              </Link>{" "}
              to start taking tests.
            </p>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
