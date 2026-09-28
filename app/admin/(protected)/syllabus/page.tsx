import { Suspense } from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { LocalizedName } from "@/components/admin/localized-name";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import {
  localizedSortField,
  resolveListParams,
  type ListSearchParams,
} from "@/src/lib/api/list-params";
import { Board } from "@/src/modules/syllabus/board.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Question } from "@/src/modules/questions/question.model";
import { Exam } from "@/src/modules/exams/exam.model";

const COLUMNS = ["Name", "Exam", "Topics", "Questions", "Easy", "Medium", "Hard", "Status"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const topicsHref = (boardId: unknown) => `/admin/syllabus/subjects?board=${String(boardId)}`;

export default async function BoardsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs active="/admin/syllabus" tabs={[{"href":"/admin/syllabus","label":"Subjects"},{"href":"/admin/syllabus/subjects","label":"Topics"}]} />
      <div className="mt-6">
        <AdminTableShell
          title="Subjects"
          newHref="/admin/syllabus/new"
          resource="syllabus"
          newLabel="New Subject"
          toolbar={<TableSearchBar placeholder="Search subjects…" />}
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
  const { q, page, limit, skip, lang } = resolveListParams(searchParams);
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

  const [sorted, total] = await Promise.all([
    Board.aggregate([
      { $match: filter },
      { $addFields: { sortName: localizedSortField(lang, "name", "nameTa") } },
      { $sort: { sortName: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Board.countDocuments(filter),
  ]);
  // Look exams up directly rather than via populate, which silently returns
  // nothing when the dev server's cached Board model predates examId.
  const [exams, topics] = await Promise.all([
    Exam.find({ _id: { $in: sorted.map((b) => b.examId).filter(Boolean) } })
      .select("name nameTa")
      .lean<{ _id: unknown; name: string; nameTa?: string }[]>(),
    Subject.find({ boardId: { $in: sorted.map((b) => b._id) } }).select("boardId").lean<{ _id: unknown; boardId: unknown }[]>(),
  ]);
  const counts = await Question.aggregate<{
    _id: { subjectId: unknown; difficulty: string };
    count: number;
  }>([
    { $match: { subjectId: { $in: topics.map((t) => t._id) } } },
    { $group: { _id: { subjectId: "$subjectId", difficulty: "$difficulty" }, count: { $sum: 1 } } },
  ]);

  const examById = new Map(exams.map((e) => [String(e._id), e]));
  const items = sorted.map((b) => ({ ...b, exam: b.examId ? examById.get(String(b.examId)) : undefined }));

  // Per subject: topic count, question total, and a count for each difficulty.
  const boardOfTopic = new Map(topics.map((t) => [String(t._id), String(t.boardId)]));
  const countById = new Map<string, Record<string, number>>();
  const entryFor = (boardId: string) => {
    const entry = countById.get(boardId) ?? { topics: 0, total: 0 };
    countById.set(boardId, entry);
    return entry;
  };
  for (const t of topics) entryFor(String(t.boardId)).topics += 1;
  for (const c of counts) {
    const boardId = boardOfTopic.get(String(c._id.subjectId));
    if (!boardId) continue;
    const entry = entryFor(boardId);
    entry.total += c.count;
    entry[c._id.difficulty] = (entry[c._id.difficulty] ?? 0) + c.count;
  }

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={9} label="No subjects yet." />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.map((item: any) => (
            <tr key={String(item._id)}>
              <td className="px-4 py-3 font-medium">
                <Link href={topicsHref(item._id)} className="hover:text-primary hover:underline">
                  <LocalizedName lang={lang} en={item.name} ta={item.nameTa} />
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.exam ? <LocalizedName lang={lang} en={item.exam.name} ta={item.exam.nameTa} /> : "—"}
              </td>
              <td className="px-4 py-3 font-medium">
                {countById.get(String(item._id))?.topics ?? 0}
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
                    href={topicsHref(item._id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="View topics"
                    title="View topics"
                  >
                    <Eye className="size-4" />
                  </Link>
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
