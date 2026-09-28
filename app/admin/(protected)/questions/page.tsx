import { Suspense } from "react";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { FileJson, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can } from "@/src/lib/auth/permissions";
import { QuestionPreviewButton } from "@/components/admin/question-preview-button";
import { SearchableFilter } from "@/components/admin/searchable-filter";
import {
  BulkSelectAllCheckbox,
  BulkSelectCheckbox,
  BulkSelectionPageIds,
  BulkSelectionProvider,
} from "@/components/admin/bulk-selection";
import { QuestionBulkActions } from "@/components/admin/question-bulk-actions";
import { connectDB } from "@/src/lib/mongodb";
import { localizedPair, resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { Board } from "@/src/modules/syllabus/board.model";

const COLUMNS = ["Question", "Topic", "Type", "Difficulty", "Status"];

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const [resolvedSearchParams, access] = await Promise.all([searchParams, getAdminAccess()]);

  return (
    <BulkSelectionProvider>
      <AdminTableShell
        title="Question Bank"
        description="Reusable questions, mapped to syllabus and shared across tests."
        newHref="/admin/questions/new"
        resource="questions"
        newLabel="New Question"
        actions={
          can(access, "questions", "create") ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/admin/questions/import">
                  <FileJson className="size-4" />
                  JSON Questions
                </Link>
              }
            />
          ) : null
        }
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-64 flex-1">
                <TableSearchBar placeholder="Search questions…" />
              </div>
              <Suspense
                fallback={<SearchableFilter param="subject" options={[]} placeholder="All topics" />}
              >
                <SubjectFilter />
              </Suspense>
            </div>
            <QuestionBulkActions
              canUpdate={can(access, "questions", "update")}
              canDelete={can(access, "questions", "delete")}
            />
          </div>
        }
      >
        <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} selectHeader={<BulkSelectAllCheckbox />} />}>
          <QuestionsTable searchParams={resolvedSearchParams} />
        </Suspense>
      </AdminTableShell>
    </BulkSelectionProvider>
  );
}

async function SubjectFilter() {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subjects, boards]: [any[], any[]] = await Promise.all([
    Subject.find().select("name boardId").sort({ name: 1 }).lean(),
    Board.find().select("name").lean(),
  ]);
  const boardNames = new Map(boards.map((b) => [String(b._id), b.name]));
  const subjectOptions = subjects.map((s) => {
    const board = boardNames.get(String(s.boardId));
    return {
      value: String(s._id),
      label: board ? `${s.name} (${board})` : s.name,
    };
  });

  return <SearchableFilter param="subject" options={subjectOptions} placeholder="All topics" />;
}

async function QuestionsTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip, lang } = resolveListParams(searchParams);
  const rawSubject = searchParams.subject;
  const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (q) {
    filter.$or = [
      { "question.en": { $regex: q, $options: "i" } },
      { "question.ta": { $regex: q, $options: "i" } },
    ];
  }
  if (subject && isValidObjectId(subject)) {
    filter.subjectId = subject;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, total]: [any[], number] = await Promise.all([
    Question.find(filter)
      .populate("subjectId", "name nameTa")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return (
    <>
      <BulkSelectionPageIds ids={items.map((item) => String(item._id))} />
      <AdminTable
        columns={COLUMNS}
        startIndex={skip}
        selectHeader={<BulkSelectAllCheckbox />}
      >
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={7} label="No questions yet." />
        ) : (
          items.map((item) => {
            const question = localizedPair(lang, item.question?.en, item.question?.ta);
            return (
              <tr key={String(item._id)}>
                <td className="w-10 py-3 pr-0 pl-4">
                  <BulkSelectCheckbox
                    id={String(item._id)}
                    label={`Select question: ${item.question?.en || item.question?.ta || ""}`}
                  />
                </td>
                <td className="max-w-md px-4 py-3 font-medium">
                  <p className="truncate">{question.primary}</p>
                  {question.secondary ? (
                    <p className="truncate text-sm font-normal text-muted-foreground">
                      {question.secondary}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.subjectId ? localizedPair(lang, item.subjectId.name, item.subjectId.nameTa).primary : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.type}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {item.difficulty}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <QuestionPreviewButton
                      question={{
                        type: item.type,
                        difficulty: item.difficulty,
                        question: { en: item.question?.en, ta: item.question?.ta },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        options: (item.options ?? []).map((o: any) => ({
                          id: o.id,
                          text: { en: o.text?.en, ta: o.text?.ta },
                        })),
                        correctAnswer: item.correctAnswer,
                        explanation: {
                          en: item.explanation?.en,
                          ta: item.explanation?.ta,
                        },
                      }}
                    />
                    <Can resource="questions" action="update">
                      <Link
                        href={`/admin/questions/${item._id}`}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Can>
                    <Can resource="questions" action="delete">
                      <DeleteRowButton
                        resource="questions"
                        id={String(item._id)}
                      />
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
