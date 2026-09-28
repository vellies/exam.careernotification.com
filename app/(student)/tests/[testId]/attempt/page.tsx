import { TestAttemptRunner } from "@/components/student/test-attempt-runner";

export default async function TestAttemptPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  return <TestAttemptRunner testId={testId} />;
}
