import { Suspense } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/shared/page-loader";
import { getSession } from "@/src/lib/auth/session";
import { connectDB } from "@/src/lib/mongodb";
import { Attempt } from "@/src/modules/attempts/attempt.model";

export const revalidate = 0;

export default function ResultsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Results</h1>
      <p className="mt-2 text-muted-foreground">Your scored attempts.</p>

      <Suspense fallback={<SectionLoader />}>
        <ResultsList />
      </Suspense>
    </div>
  );
}

async function ResultsList() {
  const session = await getSession();
  await connectDB();

  const attempts = session
    ? await Attempt.find({ userId: session.sub, status: "submitted" })
        .populate("testId", "title titleTa")
        .sort({ submittedAt: -1 })
        .lean()
    : [];

  return (
    <>
      {attempts.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No submitted tests yet — attempt a test to see your results here.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {attempts.map((attempt) => (
            <Link
              key={String(attempt._id)}
              href={`/my-results/${String(attempt._id)}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {(attempt.testId as { title?: string })?.title ?? "Test"}
                </h2>
                {(attempt.testId as { titleTa?: string })?.titleTa ? (
                  <p className="text-sm text-muted-foreground">
                    {(attempt.testId as { titleTa?: string }).titleTa}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Award className="size-3.5" />
                {attempt.score} / {attempt.totalMarks}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
