import { Suspense } from "react";
import Link from "next/link";
import { Types, isValidObjectId } from "mongoose";
import { Eye, Pencil } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { SearchableFilter } from "@/components/admin/searchable-filter";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import {
  localizedPair,
  localizedSortField,
  resolveListParams,
  type ListSearchParams,
} from "@/src/lib/api/list-params";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Board } from "@/src/modules/syllabus/board.model";
import { Question } from "@/src/modules/questions/question.model";

const COLUMNS = ["Subject", "Name", "Questions", "Easy", "Medium", "Hard", "Status"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs active="/admin/syllabus/subjects" tabs={[{"href":"/admin/syllabus","label":"Subjects"},{"href":"/admin/syllabus/subjects","label":"Topics"}]} />
      <div className="mt-6">
        <AdminTableShell
          title="Topics"
          newHref="/admin/syllabus/subjects/new"
          resource="syllabus"
          newLabel="New Topic"
          toolbar={
            <TableSearchBar
              placeholder="Search topics…"
              filters={
                <Suspense
                  fallback={<SearchableFilter param="board" options={[]} placeholder="All subjects" />}
                >
                  <BoardFilter />
                </Suspense>
              }
            />
          }
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <SubjectsTable searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function BoardFilter() {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boards: any[] = await Board.find().select("name nameTa").sort({ name: 1 }).lean();
  const boardOptions = boards.map((b) => ({
    value: String(b._id),
    label: b.nameTa ? `${b.name} (${b.nameTa})` : b.name,
  }));

  return <SearchableFilter param="board" options={boardOptions} placeholder="All subjects" />;
}

async function SubjectsTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip, lang } = resolveListParams(searchParams);
  const rawBoard = searchParams.board;
  const board = Array.isArray(rawBoard) ? rawBoard[0] : rawBoard;
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { nameTa: { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
    ];
  }
  // Aggregation $match doesn't cast strings, so the id must be an ObjectId.
  if (board && isValidObjectId(board)) {
    filter.boardId = new Types.ObjectId(board);
  }

  // In Tamil mode, order by the Tamil name, falling back to `name` for topics without one.
  const [sorted, total] = await Promise.all([
    Subject.aggregate([
      { $match: filter },
      { $addFields: { sortName: localizedSortField(lang, "name", "nameTa") } },
      { $sort: { sortName: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Subject.countDocuments(filter),
  ]);
  const items = await Subject.populate(sorted, { path: "boardId", select: "name nameTa" });

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
          items.map((item: any) => {
            const name = localizedPair(lang, item.name, item.nameTa);
            return (
              <tr key={String(item._id)}>
                <td className="px-4 py-3 text-muted-foreground">{item.boardId ? localizedPair(lang, item.boardId.name, item.boardId.nameTa).primary : "—"}</td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/admin/syllabus/subjects/${item._id}/questions`}
                    className="hover:text-primary hover:underline"
                  >
                    {name.primary}
                  </Link>
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
            );
          })
        )}
      </AdminTable>
      <AdminPagination page={page} limit={limit} total={total} searchParams={searchParams} />
    </>
  );
}
