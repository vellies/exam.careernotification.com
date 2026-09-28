import { PageShell, ComingSoon } from "@/components/shared/page-shell";

export default function CurrentAffairsPage() {
  return (
    <PageShell
      eyebrow="Daily Updates"
      title="Current Affairs"
      description="Daily current-affairs content, feeding into daily quizzes and question tagging."
    >
      <ComingSoon label="Current affairs feed" />
    </PageShell>
  );
}
