import { Suspense } from "react";
import { Library, ClipboardList, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupsChart } from "@/components/admin/signups-chart";
import { PurchaseStatusChart } from "@/components/admin/purchase-status-chart";
import { SectionLoader } from "@/components/shared/page-loader";
import { connectDB } from "@/src/lib/mongodb";
import { Question } from "@/src/modules/questions/question.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { User } from "@/src/modules/users/user.model";
import { Purchase } from "@/src/modules/payments/purchase.model";

export const revalidate = 0;

const SIGNUP_WINDOW_DAYS = 14;

async function getSignupSeries() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (SIGNUP_WINDOW_DAYS - 1));

  const rows = await User.aggregate([
    { $match: { role: "student", createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.count]));

  const series: { date: string; count: number }[] = [];
  for (let i = 0; i < SIGNUP_WINDOW_DAYS; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return series;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  return (
    <div>
      {denied ? (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          You don&apos;t have permission to open that page. Ask a super admin for access.
        </p>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Content, exams and platform metrics at a glance.
      </p>

      <Suspense fallback={<SectionLoader />}>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={null}>
        <DashboardCharts />
      </Suspense>
    </div>
  );
}

async function DashboardStats() {
  await connectDB();

  const [publishedQuestions, activeTestSeries, registeredStudents, pendingPurchases] =
    await Promise.all([
      Question.countDocuments({ status: "published" }),
      TestSeries.countDocuments({ status: "published" }),
      User.countDocuments({ role: "student" }),
      Purchase.countDocuments({ status: "pending" }),
    ]);

  const STATS = [
    { label: "Published Questions", value: publishedQuestions, icon: Library },
    { label: "Active Test Series", value: activeTestSeries, icon: ClipboardList },
    { label: "Registered Students", value: registeredStudents, icon: Users },
    { label: "Pending Purchase Requests", value: pendingPurchases, icon: Wallet },
  ];

  return (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </CardTitle>
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <stat.icon className="size-4" strokeWidth={1.75} />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

  );
}

async function DashboardCharts() {
  await connectDB();

  const [signupSeries, purchaseCounts] = await Promise.all([
    getSignupSeries(),
    Purchase.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const purchaseByStatus = new Map(purchaseCounts.map((r) => [r._id, r.count]));

  return (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                New student signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignupsChart data={signupSeries} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Purchase requests by status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseStatusChart
                segments={[
                  { key: "pending", label: "Pending", count: purchaseByStatus.get("pending") ?? 0, color: "#fab219" },
                  { key: "paid", label: "Approved", count: purchaseByStatus.get("paid") ?? 0, color: "#0ca30c" },
                  { key: "rejected", label: "Rejected", count: purchaseByStatus.get("rejected") ?? 0, color: "#d03b3b" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
  );
}
