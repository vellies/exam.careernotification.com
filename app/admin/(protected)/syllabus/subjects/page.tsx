import { Suspense } from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Question } from "@/src/modules/questions/question.model";

const COLUMNS = ["Board", "Name", "Questions", "Easy", "Medium", "Hard", "Status"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs active="/admin/syllabus/subjects" tabs={[{"href":"/admin/syllabus/subjects","label":"Topics"},{"href":"/admin/syllabus","label":"Boards"}]} />
      <div className="mt-6">
        <AdminTableShell
          title="Topics"
          newHref="/admin/syllabus/subjects/new"
          resource="syllabus"
          newLabel="New Topic"
          toolbar={<TableSearchBar placeholder="Search topics…" />}
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <SubjectsTable searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function SubjectsTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { nameTa: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Subject.find(filter)
      .populate("boardId", "name")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subject.countDocuments(filter),
  ]);

  const counts = await Question.aggregate<{
    _id: { subjectId: unknown; difficulty: string };
    count: number;
  }>([
    { $match: { subjectId: { $in: items.map((item) => item._id) } } },
    { $group: { _id: { subjectId: "$subjectId", difficulty: "$difficulty" }, count: { $sum: 1 } } },
  ]);
  // Per topic: total plus a count for each difficulty.
  const countById = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const key = String(c._id.subjectId);
    const entry = countById.get(key) ?? { total: 0 };
    entry.total += c.count;
    entry[c._id.difficulty] = (entry[c._id.difficulty] ?? 0) + c.count;
    countById.set(key, entry);
  }

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={8} label="No topics yet." />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.map((item: any) => (
            <tr key={String(item._id)}>
              <td className="px-4 py-3 text-muted-foreground">{item.boardId?.name ?? "—"}</td>
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/admin/syllabus/subjects/${item._id}/questions`}
                  className="hover:text-primary hover:underline"
                >
                  {item.name}
                </Link>
                {/* Tamil-only topics already show the Tamil text as `name`. */}
                {item.nameTa && item.nameTa !== item.name ? (
                  <p className="text-sm font-normal text-muted-foreground">{item.nameTa}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 font-medium">
                {countById.get(String(item._id))?.total ?? 0}
              </td>
              {DIFFICULTIES.map((d) => (
                <td key={d} className="px-4 py-3 text-muted-foreground">
                  {countById.get(String(item._id))?.[d] ?? 0}
                </td>
              ))}
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/syllabus/subjects/${item._id}/questions`}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="View questions"
                    title="View questions"
                  >
                    <Eye className="size-4" />
                  </Link>
                  <Can resource="syllabus" action="update">
                    <Link
                      href={`/admin/syllabus/subjects/${item._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="syllabus" action="delete">
                    <DeleteRowButton resource="subjects" id={String(item._id)} />
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
