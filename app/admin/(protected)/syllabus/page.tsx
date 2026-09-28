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
import { Board } from "@/src/modules/syllabus/board.model";

const COLUMNS = ["Name", "Status"];

export default async function BoardsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs active="/admin/syllabus" tabs={[{"href":"/admin/syllabus/subjects","label":"Topics"},{"href":"/admin/syllabus","label":"Boards"}]} />
      <div className="mt-6">
        <AdminTableShell
          title="Boards"
          newHref="/admin/syllabus/new"
          resource="syllabus"
          newLabel="New Board"
          toolbar={<TableSearchBar placeholder="Search boards…" />}
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <BoardsTable searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function BoardsTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();

  const filter = q
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { slug: { $regex: q, $options: "i" } }] }
    : {};

  const [items, total] = await Promise.all([
    Board.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Board.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={3} label="No boards yet." />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.map((item: any) => (
            <tr key={String(item._id)}>
              <td className="px-4 py-3 font-medium">
                <p>{item.name}</p>
                {item.nameTa ? (
                  <p className="text-sm font-normal text-muted-foreground">{item.nameTa}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Can resource="syllabus" action="update">
                    <Link
                      href={`/admin/syllabus/${item._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="syllabus" action="delete">
                    <DeleteRowButton resource="boards" id={String(item._id)} />
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
