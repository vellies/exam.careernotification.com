import { Suspense } from "react";
import Link from "next/link";
import { Pencil, ListChecks } from "lucide-react";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { TestSeries } from "@/src/modules/test-series/test-series.model";

const COLUMNS = ["Title", "Exam", "Access", "Window", "Status"];

export default async function TestSeriesPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AdminTableShell
      title="Test Series"
      description="Collections of tests grouped under an exam, e.g. TNPSC Group 4 2026 Complete Test Series."
      newHref="/admin/test-series/new"
      resource="testSeries"
      newLabel="New Test Series"
      toolbar={<TableSearchBar placeholder="Search test series…" />}
    >
      <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
        <TestSeriesTable searchParams={resolvedSearchParams} />
      </Suspense>
    </AdminTableShell>
  );
}

async function TestSeriesTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();

  const filter = q ? { title: { $regex: q, $options: "i" } } : {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, total]: [any[], number] = await Promise.all([
    TestSeries.find(filter)
      .populate("examId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TestSeries.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={6} label="No test series yet." />
        ) : (
          items.map((item) => (
            <tr key={String(item._id)}>
              <td className="px-4 py-3 font-medium">
                <p>{item.title}</p>
                {item.titleTa ? (
                  <p className="text-sm font-normal text-muted-foreground">{item.titleTa}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.examId?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground capitalize">
                {item.access}
                {item.access !== "free" ? ` · ₹${item.price ?? 0}` : ""}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {item.startDate ? <p>Opens {new Date(item.startDate).toLocaleString()}</p> : null}
                {item.endDate ? <p>Closes {new Date(item.endDate).toLocaleString()}</p> : null}
                {!item.startDate && !item.endDate ? "Always open" : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Can resource="tests" action="read">
                    <Link
                      href={`/admin/tests?testSeriesId=${item._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Manage tests"
                    >
                      <ListChecks className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="testSeries" action="update">
                    <Link
                      href={`/admin/test-series/${item._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="testSeries" action="delete">
                    <DeleteRowButton resource="test-series" id={String(item._id)} />
                  </Can>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
      <AdminPagination page={page} limit={limit} total={total} searchParams={searchParams} />
    </>
  );
}
