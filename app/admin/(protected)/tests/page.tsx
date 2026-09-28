import { Suspense } from "react";
import Link from "next/link";
import { Pencil, ListChecks } from "lucide-react";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { LocalizedName } from "@/components/admin/localized-name";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import { localizedPair, resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Test } from "@/src/modules/tests/test.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";

type TestsSearchParams = ListSearchParams & { testSeriesId?: string };

const COLUMNS = ["Title", "Test Series", "Questions", "Window", "Status"];

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<TestsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { testSeriesId } = resolvedSearchParams;

  return (
    <AdminTableShell
      title="Tests"
      description={
        testSeriesId ? (
          <Suspense fallback="Tests inside this test series.">
            <SeriesDescription testSeriesId={testSeriesId} />
          </Suspense>
        ) : (
          "Individual mock tests, built from the question bank."
        )
      }
      newHref={testSeriesId ? `/admin/tests/new?testSeriesId=${testSeriesId}` : "/admin/tests/new"}
      resource="tests"
      newLabel="New Test"
      toolbar={<TableSearchBar placeholder="Search tests…" />}
    >
      <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
        <TestsTable searchParams={resolvedSearchParams} />
      </Suspense>
    </AdminTableShell>
  );
}

async function SeriesDescription({ testSeriesId }: { testSeriesId: string }) {
  await connectDB();
  const series = await TestSeries.findById(testSeriesId).select("title").lean().catch(() => null);
  return `Tests inside ${series?.title ?? "this test series"}.`;
}

async function TestsTable({ searchParams }: { searchParams: TestsSearchParams }) {
  const { testSeriesId } = searchParams;
  const { q, page, limit, skip, lang } = resolveListParams(searchParams);
  await connectDB();

  const filter: Record<string, unknown> = testSeriesId ? { testSeriesId } : {};
  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { titleTa: { $regex: q, $options: "i" } }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, total]: [any[], number] = await Promise.all([
    Test.find(filter)
      .populate("testSeriesId", "title titleTa")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Test.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={6} label="No tests yet." />
        ) : (
          items.map((item) => (
            <tr key={String(item._id)}>
              <td className="px-4 py-3 font-medium">
                <LocalizedName lang={lang} en={item.title} ta={item.titleTa} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.testSeriesId
                  ? localizedPair(lang, item.testSeriesId.title, item.testSeriesId.titleTa).primary
                  : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.questions?.length ?? 0}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {item.opensAt ? (
                  <p>Opens {new Date(item.opensAt).toLocaleString()}</p>
                ) : null}
                {item.closesAt ? (
                  <p>Closes {new Date(item.closesAt).toLocaleString()}</p>
                ) : null}
                {!item.opensAt && !item.closesAt ? "Always open" : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Can resource="tests" action="update">
                    <Link
                      href={`/admin/tests/${item._id}/questions`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Manage questions"
                    >
                      <ListChecks className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="tests" action="update">
                    <Link
                      href={`/admin/tests/${item._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="tests" action="delete">
                    <DeleteRowButton resource="tests" id={String(item._id)} />
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
