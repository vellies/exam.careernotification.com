import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ArrowLeft, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { QuestionPreviewButton } from "@/components/admin/question-preview-button";
import { TopicQuestionDialog } from "@/components/admin/topic-question-dialog";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can } from "@/src/lib/auth/permissions";
import { connectDB } from "@/src/lib/mongodb";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { Question } from "@/src/modules/questions/question.model";
import { Subject } from "@/src/modules/syllabus/subject.model";

const COLUMNS = ["Question", "Type", "Difficulty", "Status"];

export default async function TopicQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const [{ id }, resolvedSearchParams, access] = await Promise.all([
    params,
    searchParams,
    getAdminAccess(),
  ]);
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topic: any = await Subject.findById(id).populate("boardId", "name").lean();
  if (!topic) notFound();

  return (
    <div>
      <Link
        href="/admin/syllabus/subjects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Topics
      </Link>
      <div className="mt-4">
        <AdminTableShell
          title={topic.name}
          description={
            [topic.boardId?.name, topic.nameTa && topic.nameTa !== topic.name ? topic.nameTa : null]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          actions={
            can(access, "questions", "create") ? (
              <>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/admin/syllabus/subjects/${id}/questions/import`}>
                      <FileJson className="size-4" />
                      JSON Questions
                    </Link>
                  }
                />
                <TopicQuestionDialog topicId={id} />
              </>
            ) : null
          }
          toolbar={<TableSearchBar placeholder="Search questions…" />}
        >
          <Suspense
            key={JSON.stringify(resolvedSearchParams)}
            fallback={<AdminTableLoading columns={COLUMNS} />}
          >
            <TopicQuestionsTable topicId={id} searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function TopicQuestionsTable({
  topicId,
  searchParams,
}: {
  topicId: string;
  searchParams: ListSearchParams;
}) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { subjectId: topicId };
  if (q) {
    filter.$or = [
      { "question.en": { $regex: q, $options: "i" } },
      { "question.ta": { $regex: q, $options: "i" } },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, total]: [any[], number] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Question.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {items.length === 0 ? (
          <AdminEmptyRow colSpan={5} label="No questions in this topic yet." />
        ) : (
          items.map((item) => (
            <tr key={String(item._id)}>
              <td className="max-w-md px-4 py-3 font-medium">
                <p className="truncate">{item.question?.en || item.question?.ta}</p>
                {item.question?.en && item.question?.ta ? (
                  <p className="truncate text-sm font-normal text-muted-foreground">
                    {item.question.ta}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{item.type}</td>
              <td className="px-4 py-3 text-muted-foreground capitalize">{item.difficulty}</td>
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
                      explanation: { en: item.explanation?.en, ta: item.explanation?.ta },
                    }}
                  />
                  <Can resource="questions" action="update">
                    <TopicQuestionDialog
                      topicId={topicId}
                      question={{
                        id: String(item._id),
                        initial: {
                          type: item.type,
                          questionEn: item.question?.en ?? "",
                          questionTa: item.question?.ta ?? "",
                          options: item.options?.length
                            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              item.options.map((o: any) => ({
                                id: o.id,
                                text: { en: o.text?.en ?? "", ta: o.text?.ta ?? "" },
                              }))
                            : [
                                { id: "A", text: { en: "", ta: "" } },
                                { id: "B", text: { en: "", ta: "" } },
                              ],
                          correctAnswer: item.correctAnswer ?? "",
                          explanationEn: item.explanation?.en ?? "",
                          explanationTa: item.explanation?.ta ?? "",
                          difficulty: item.difficulty,
                          subjectId: topicId,
                          tags: (item.tags ?? []).join(", "),
                          status: item.status,
                        },
                      }}
                    />
                  </Can>
                  <Can resource="questions" action="delete">
                    <DeleteRowButton resource="questions" id={String(item._id)} />
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
