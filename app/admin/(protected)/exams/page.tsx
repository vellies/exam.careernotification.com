import { Suspense } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Exam } from "@/src/modules/exams/exam.model";

const COLUMNS = ["Name", "Category", "Status"];

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs
        active="/admin/exams"
        tabs={[
          { href: "/admin/exams", label: "Exams" },
          { href: "/admin/exams/categories", label: "Categories" },
        ]}
      />
      <div className="mt-6">
        <AdminTableShell
          title="Exams"
          description="Reusable exam definitions, e.g. TNPSC Group 4, SSC CGL."
          newHref="/admin/exams/new"
          resource="exams"
          newLabel="New Exam"
          toolbar={<TableSearchBar placeholder="Search exams…" />}
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <ExamsTable searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function ExamsTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();

  const filter = q
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { slug: { $regex: q, $options: "i" } }] }
    : {};

  const [exams, total] = await Promise.all([
    Exam.find(filter)
      .populate("examCategoryId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Exam.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {exams.length === 0 ? (
          <AdminEmptyRow colSpan={4} label="No exams yet." />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          exams.map((exam: any) => (
            <tr key={String(exam._id)}>
              <td className="px-4 py-3 font-medium">
                <p>{exam.name}</p>
                {exam.nameTa ? (
                  <p className="text-sm font-normal text-muted-foreground">{exam.nameTa}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {exam.examCategoryId?.name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={exam.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Can resource="exams" action="update">
                    <Link
                      href={`/admin/exams/${exam._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="exams" action="delete">
                    <DeleteRowButton resource="exams" id={String(exam._id)} />
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
