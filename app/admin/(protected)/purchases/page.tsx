import { Suspense } from "react";
import Link from "next/link";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { PurchaseDecisionButton } from "@/components/admin/purchase-decision-button";
import { cn } from "@/lib/utils";
import { connectDB } from "@/src/lib/mongodb";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can } from "@/src/lib/auth/permissions";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Purchase } from "@/src/modules/payments/purchase.model";
import { User } from "@/src/modules/users/user.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
] as const;

const PAYMENT_MODE_LABELS: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
};

type PurchasesSearchParams = ListSearchParams & { status?: string };

const COLUMNS = ["Student", "Test Series", "Amount", "Payment Details", "Requested", "Status"];

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<PurchasesSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const statusFilter = resolvedSearchParams.status ?? "pending";

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `?status=${tab.value}` : "?status="}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              statusFilter === tab.value
                ? "border-primary text-foreground"
                : "border-transparent",
            )}
          >
            {tab.label}
            {tab.value === "pending" ? (
              <Suspense fallback={null}>
                <PendingCountBadge />
              </Suspense>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <AdminTableShell
          title="Purchase Requests"
          description="Students request access to a paid test series — approve to grant access, or reject."
          toolbar={<TableSearchBar placeholder="Search by student or test series…" />}
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <PurchasesTable searchParams={resolvedSearchParams} statusFilter={statusFilter} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function PendingCountBadge() {
  await connectDB();
  const pendingCount = await Purchase.countDocuments({ status: "pending" });
  return pendingCount > 0 ? (
    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
      {pendingCount}
    </span>
  ) : null;
}

async function PurchasesTable({
  searchParams,
  statusFilter,
}: {
  searchParams: PurchasesSearchParams;
  statusFilter: string;
}) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();
  const canDecide = can(await getAdminAccess(), "purchases", "update");

  const filter: Record<string, unknown> = {};
  if (statusFilter) filter.status = statusFilter;

  if (q) {
    const regex = { $regex: q, $options: "i" };
    const [matchingUsers, matchingSeries] = await Promise.all([
      User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id").lean(),
      TestSeries.find({ title: regex }).select("_id").lean(),
    ]);
    filter.$or = [
      { userId: { $in: matchingUsers.map((u) => u._id) } },
      { testSeriesId: { $in: matchingSeries.map((s) => s._id) } },
    ];
  }

  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .populate("userId", "name email")
      .populate("testSeriesId", "title")
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .lean<any[]>(),
    Purchase.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={7} label="No purchase requests here." />
        ) : (
          items.map((item) => {
            const student = item.userId;
            const series = item.testSeriesId;
            return (
              <tr key={String(item._id)}>
                <td className="px-4 py-3">
                  <p className="font-medium">{student?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{student?.email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {series?.title ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">₹{item.amount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <p>
                    {PAYMENT_MODE_LABELS[item.paymentMode] ?? item.paymentMode} ·{" "}
                    <span className="font-mono text-xs">{item.paymentReference}</span>
                  </p>
                  <p className="text-xs">{item.phone}</p>
                  {item.description ? (
                    <p
                      className="mt-0.5 max-w-56 truncate text-xs italic"
                      title={item.description}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(item.requestedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  {item.status === "pending" && student && series && canDecide ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <PurchaseDecisionButton
                        id={String(item._id)}
                        decision="paid"
                        studentName={student.name}
                        seriesTitle={series.title}
                      />
                      <PurchaseDecisionButton
                        id={String(item._id)}
                        decision="rejected"
                        studentName={student.name}
                        seriesTitle={series.title}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
      <AdminPagination page={page} limit={limit} total={total} searchParams={searchParams} />
    </>
  );
}
