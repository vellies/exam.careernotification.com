import { Suspense } from "react";
import Link from "next/link";
import { ListChecks, Target, Percent, Bookmark, BadgeCheck, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/shared/page-loader";
import { getSession } from "@/src/lib/auth/session";
import { connectDB } from "@/src/lib/mongodb";
import { TestSeries } from "@/src/modules/test-series/test-series.model";

export const revalidate = 0;

const STATS = [
  { label: "Tests Attempted", value: "0", icon: ListChecks },
  { label: "Average Score", value: "—", icon: Target },
  { label: "Accuracy", value: "—", icon: Percent },
  { label: "Bookmarked Questions", value: "0", icon: Bookmark },
];

export default async function DashboardOverviewPage() {
  const session = await getSession();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome{session ? `, ${session.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your performance summary will appear here as you attempt tests.
      </p>

      {session ? (
        <Card className="mt-6 border-border shadow-none">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Name
              </p>
              <p className="mt-1 text-sm font-medium">{session.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Email
              </p>
              <p className="mt-1 text-sm font-medium">{session.email}</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <BadgeCheck className="size-4" strokeWidth={1.75} />
              <span className="text-sm font-medium">Email verified</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-4" strokeWidth={1.75} />
              <span className="text-sm">Member of VR TEST BATCH</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-primary" strokeWidth={1.75} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Explore test series
          </h2>
          <Link
            href="/test-series"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <Suspense fallback={<SectionLoader />}>
          <SeriesPreview />
        </Suspense>
      </div>
    </div>
  );
}

async function SeriesPreview() {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = await TestSeries.find({ status: "published" })
    .populate("examId", "name")
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  return (
    series.length === 0 ? (
      <p className="mt-4 text-sm text-muted-foreground">
        No test series published yet — check back soon.
      </p>
    ) : (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {series.map((item) => (
          <Link
            key={String(item._id)}
            href={`/test-series/${item.slug}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div>
              <p className="text-sm font-bold tracking-tight">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.examId?.name}
              </p>
            </div>
            <Badge variant={item.access === "free" ? "secondary" : "default"}>
              {item.access}
            </Badge>
          </Link>
        ))}
      </div>
    )
  );
}
