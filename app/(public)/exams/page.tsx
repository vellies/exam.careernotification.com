import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLoader } from "@/components/shared/page-loader";
import { PageShell, ComingSoon } from "@/components/shared/page-shell";
import { connectDB } from "@/src/lib/mongodb";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import { Exam } from "@/src/modules/exams/exam.model";

export const revalidate = 0;

export default function ExamsPage() {
  return (
    <PageShell
      eyebrow="Exam Categories"
      title="Exams"
      description="TNPSC, SSC, Banking, Railway and Technical exam notifications and cycles."
    >
      <Suspense fallback={<SectionLoader />}>
        <ExamCategoriesGrid />
      </Suspense>
    </PageShell>
  );
}

async function ExamCategoriesGrid() {
  await connectDB();
  const categories = await ExamCategory.find({ status: "active" })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const exams = await Exam.find({
    status: "active",
    examCategoryId: { $in: categories.map((c) => c._id) },
  })
    .sort({ name: 1 })
    .lean();

  const examsByCategory = new Map<string, typeof exams>();
  for (const exam of exams) {
    const key = String(exam.examCategoryId);
    examsByCategory.set(key, [...(examsByCategory.get(key) ?? []), exam]);
  }

  return (
    <>
      {categories.length === 0 ? (
        <ComingSoon label="Exam listing" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const categoryExams = examsByCategory.get(String(category._id)) ?? [];
            return (
              <div
                key={String(category._id)}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h2 className="text-base font-bold tracking-tight">{category.name}</h2>
                {categoryExams.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No exams published yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {categoryExams.map((exam) => (
                      <li key={String(exam._id)}>
                        <Link
                          href={`/test-series?exam=${exam.slug}`}
                          className="group flex items-center justify-between text-sm text-foreground/80 hover:text-foreground"
                        >
                          {exam.name}
                          <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
