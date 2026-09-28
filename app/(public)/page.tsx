import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Languages,
  Timer,
  ArrowRight,
  Landmark,
  FileText,
  PiggyBank,
  Award,
  TrainFront,
  Cpu,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { connectDB } from "@/src/lib/mongodb";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { Question } from "@/src/modules/questions/question.model";

export const revalidate = 0;

const CATEGORY_STYLES: Record<string, { icon: typeof Landmark; className: string }> = {
  tnpsc: { icon: Landmark, className: "bg-orange-50 text-orange-600" },
  ssc: { icon: FileText, className: "bg-blue-50 text-blue-600" },
  banking: { icon: PiggyBank, className: "bg-emerald-50 text-emerald-600" },
  upsc: { icon: Award, className: "bg-purple-50 text-purple-600" },
  railway: { icon: TrainFront, className: "bg-amber-50 text-amber-600" },
  technical: { icon: Cpu, className: "bg-cyan-50 text-cyan-600" },
  teaching: { icon: GraduationCap, className: "bg-pink-50 text-pink-600" },
  police: { icon: ShieldCheck, className: "bg-red-50 text-red-600" },
};
const DEFAULT_CATEGORY_STYLE = { icon: Building2, className: "bg-slate-50 text-slate-600" };

const PILLARS = [
  {
    icon: BookOpen,
    title: "Reusable Question Bank",
    description:
      "One question, mapped to every syllabus and exam that needs it — never duplicated per class or exam.",
  },
  {
    icon: Timer,
    title: "Test Series & Mock Tests",
    description:
      "Timed, negative-marked mock tests generated from a versioned exam blueprint.",
  },
  {
    icon: Languages,
    title: "Tamil + English Content",
    description:
      "Every question, option and explanation is first-class in both languages.",
  },
  {
    icon: GraduationCap,
    title: "6th–12th School Syllabus",
    description:
      "Board and topic content that feeds directly into competitive-exam practice.",
  },
];

export default async function HomePage() {
  await connectDB();

  const [categories, testSeriesCount, questionCount] = await Promise.all([
    ExamCategory.find({ status: "active" }).sort({ sortOrder: 1, name: 1 }).limit(8).lean(),
    TestSeries.countDocuments({ status: "published" }),
    Question.countDocuments({ status: "published" }),
  ]);

  const stats = [
    { value: String(categories.length), label: "Exam categories" },
    { value: String(testSeriesCount), label: "Test series" },
    { value: String(questionCount), label: "Questions" },
  ];

  return (
    <div>
      <section className="overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase backdrop-blur">
              TNPSC &middot; SSC &middot; Banking &middot; School Syllabus
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-tight text-white md:text-5xl">
              Exam notifications &amp; practice, built to scale.
            </h1>
            <p className="mt-5 max-w-lg text-white/85">
              VR TEST BATCH brings together exam notifications, test
              series and a reusable question bank across TNPSC, SSC, Banking
              and 6th–12th school syllabus.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="rounded-full bg-white px-6 text-orange-600 hover:bg-white/90"
                render={<Link href="/exams">Browse Exams</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                className="rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10"
                render={<Link href="/signup">Create Free Account</Link>}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-xl">
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border pb-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-tight text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            {categories.length === 0 ? (
              <p className="mt-4 flex min-h-20 items-center justify-center text-center text-xs text-muted-foreground">
                Exam categories will appear here once published.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {categories.map((category) => {
                  const style = CATEGORY_STYLES[category.slug] ?? DEFAULT_CATEGORY_STYLE;
                  return (
                    <Link
                      key={String(category._id)}
                      href="/exams"
                      className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-transform hover:-translate-y-0.5"
                    >
                      <span
                        className={`flex size-10 items-center justify-center rounded-full ${style.className}`}
                      >
                        <style.icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-[11px] font-medium text-foreground/80">
                        {category.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Built on reusable content
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              A question is master content. Exams, tests and daily quizzes
              are consumers of that content — never duplicated.
            </p>
          </div>
          <Link
            href="/exams"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex"
          >
            See how it works <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Card
              key={pillar.title}
              className="border-border shadow-none transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <pillar.icon className="size-5" strokeWidth={1.5} />
                </div>
                <CardTitle className="mt-3 text-base tracking-tight">
                  {pillar.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/65">
                  {pillar.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
