import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Award, CheckCircle2, XCircle, MinusCircle, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { SectionLoader } from "@/components/shared/page-loader";
import { getSession } from "@/src/lib/auth/session";
import { connectDB } from "@/src/lib/mongodb";
import { Attempt } from "@/src/modules/attempts/attempt.model";
import { Test } from "@/src/modules/tests/test.model";
import { Question } from "@/src/modules/questions/question.model";
import { finalizeAttempt, isExpired } from "@/src/modules/attempts/finalize";
import { buildResultPayload } from "@/src/modules/attempts/serialize";

export const revalidate = 0;

function BilingualText({ value }: { value?: { en?: string; ta?: string } }) {
  if (!value) return null;
  // Tamil-only questions have no English text: show the Tamil as the main line.
  const showTamil = value.en?.trim() && value.ta?.trim() && value.ta.trim() !== value.en.trim();
  return (
    <>
      <span className="block">{value.en || value.ta}</span>
      {showTamil ? <span className="mt-0.5 block text-muted-foreground">{value.ta}</span> : null}
    </>
  );
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Result
      </p>

      <Suspense fallback={<SectionLoader />}>
        <ResultDetail attemptId={attemptId} />
      </Suspense>
    </div>
  );
}

async function ResultDetail({ attemptId }: { attemptId: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();

  const attempt = await Attempt.findById(attemptId);
  if (!attempt || String(attempt.userId) !== session.sub) notFound();

  const test = await Test.findById(attempt.testId);
  if (!test) notFound();

  if (isExpired(attempt)) {
    await finalizeAttempt(attempt, test);
  }
  if (attempt.status !== "submitted") {
    redirect(`/tests/${String(test._id)}/attempt`);
  }

  const questionDocs = await Question.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _id: { $in: attempt.questions.map((q: any) => q.questionId) },
  }).lean();
  const questionDocsById = new Map(questionDocs.map((q) => [String(q._id), q]));
  const data = buildResultPayload(attempt, test, questionDocsById);

  const attemptedCount = data.questions.length - data.attempt.unattemptedCount;
  const accuracy =
    attemptedCount > 0 ? Math.round((data.attempt.correctCount / attemptedCount) * 100) : 0;


  return (
    <>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.test.title}</h1>
      {data.test.titleTa ? (
        <p className="mt-0.5 text-muted-foreground">{data.test.titleTa}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Submitted {new Date(data.attempt.submittedAt).toLocaleString()}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Score
            </CardTitle>
            <Award className="size-4 text-primary" strokeWidth={1.75} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">
              {data.attempt.score} <span className="text-lg text-muted-foreground">/ {data.attempt.totalMarks}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Correct
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={1.75} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{data.attempt.correctCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Wrong
            </CardTitle>
            <XCircle className="size-4 text-destructive" strokeWidth={1.75} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{data.attempt.wrongCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Accuracy
            </CardTitle>
            <Percent className="size-4 text-primary" strokeWidth={1.75} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{accuracy}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Answer review
        </h2>
        <div className="mt-4 space-y-4">
          {data.questions.map((q) => (
            <div key={q.questionId} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <span>Question {q.order} · {q.marks}m</span>
                {q.isCorrect === true ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> +{q.marksAwarded}
                  </span>
                ) : q.isCorrect === false ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="size-3.5" /> {q.marksAwarded}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MinusCircle className="size-3.5" /> Unattempted
                  </span>
                )}
              </div>

              <div className="mt-3 text-base font-medium">
                <BilingualText value={q.question} />
              </div>

              <div className="mt-4 space-y-2">
                {q.options.map((option) => {
                  const isCorrectOption = option.id === q.correctAnswer;
                  const isSelected = option.id === q.selectedOptionId;
                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
                        isCorrectOption
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : isSelected
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-border",
                      )}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold">
                        {option.id.toUpperCase()}
                      </span>
                      <span className="flex-1">
                        <BilingualText value={option.text} />
                      </span>
                      {isCorrectOption ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : isSelected ? (
                        <XCircle className="size-4 shrink-0 text-destructive" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {q.explanation?.en || q.explanation?.ta ? (
                <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <p className="text-xs font-semibold tracking-widest uppercase">Explanation</p>
                  <p className="mt-1">{q.explanation?.en || q.explanation?.ta}</p>
                  {q.explanation?.en && q.explanation?.ta && q.explanation.ta.trim() !== q.explanation.en.trim() ? (
                    <p className="mt-0.5">{q.explanation.ta}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
