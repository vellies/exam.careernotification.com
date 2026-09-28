"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Clock, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseButton } from "@/components/student/purchase-button";
import { cn } from "cn";

type Bilingual = { en?: string; ta?: string };
type Option = { id: string; text: Bilingual };
type AttemptQuestion = {
  questionId: string;
  order: number;
  marks: number;
  negativeMarks: number;
  type: string;
  question: Bilingual;
  options: Option[];
  selectedOptionId: string | null;
  flagged: boolean;
};
type Payload = {
  attempt: { id: string; status: string; startedAt: string; expiresAt: string };
  test: {
    id: string;
    title: string;
    titleTa?: string;
    durationSeconds: number;
    negativeMarking: boolean;
    totalQuestions: number;
    totalMarks: number;
  };
  questions: AttemptQuestion[];
};

/** Renders English text (or Tamil when there's no English), plus a Tamil line only when it actually differs. */
function BilingualText({ value, className }: { value?: Bilingual; className?: string }) {
  if (!value) return null;
  // Tamil-only questions have no English text: show the Tamil as the main line.
  const showTamil = value.en?.trim() && value.ta?.trim() && value.ta.trim() !== value.en.trim();
  return (
    <span className={className}>
      <span className="block">{value.en || value.ta}</span>
      {showTamil ? <span className="mt-0.5 block text-muted-foreground">{value.ta}</span> : null}
    </span>
  );
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TestAttemptRunner({ testId }: { testId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [answers, setAnswers] = useState<Map<string, { selectedOptionId: string | null; flagged: boolean }>>(
    new Map(),
  );
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    message: string;
    purchase?: { testSeriesId: string; price: number; status: string | null; title?: string };
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justRequested, setJustRequested] = useState(false);
  const finishingRef = useRef(false);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 409 && data.attemptId) {
        router.replace(`/my-results/${data.attemptId}`);
        return;
      }
      setError({
        message: data.error ?? "Could not start this test.",
        purchase:
          res.status === 402 && data.testSeriesId
            ? {
                testSeriesId: data.testSeriesId,
                price: data.price ?? 0,
                status: data.purchaseStatus ?? null,
                title: data.seriesTitle,
              }
            : undefined,
      });
      setLoading(false);
      return;
    }

    setPayload(data);
    setAnswers(
      new Map(
        data.questions.map((q: AttemptQuestion) => [
          q.questionId,
          { selectedOptionId: q.selectedOptionId, flagged: q.flagged },
        ]),
      ),
    );
    setLoading(false);
  }, [testId, router]);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const finish = useCallback(async () => {
    if (!payload || finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    const res = await fetch(`/api/attempts/${payload.attempt.id}/finish`, { method: "POST" });
    if (res.ok) {
      router.push(`/my-results/${payload.attempt.id}`);
      return;
    }
    finishingRef.current = false;
    setSubmitting(false);
  }, [payload, router]);

  // Countdown timer, computed from the server-issued expiresAt so a page reload
  // never grants extra time. Auto-submits the instant it hits zero.
  useEffect(() => {
    if (!payload) return;
    const expiresAt = new Date(payload.attempt.expiresAt).getTime();
    function tick() {
      const remaining = Math.round((expiresAt - Date.now()) / 1000);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        finish();
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [payload, finish]);

  const saveAnswer = useCallback(
    async (questionId: string, patch: { selectedOptionId?: string | null; flagged?: boolean }) => {
      if (!payload) return;
      setSavingId(questionId);
      await fetch(`/api/attempts/${payload.attempt.id}/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, ...patch }),
      }).catch(() => null);
      setSavingId((current) => (current === questionId ? null : current));
    },
    [payload],
  );

  function selectOption(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const next = new Map(prev);
      const current = next.get(questionId) ?? { selectedOptionId: null, flagged: false };
      next.set(questionId, { ...current, selectedOptionId: optionId });
      return next;
    });
    saveAnswer(questionId, { selectedOptionId: optionId });
  }

  function toggleFlag(questionId: string) {
    setAnswers((prev) => {
      const next = new Map(prev);
      const current = next.get(questionId) ?? { selectedOptionId: null, flagged: false };
      const flagged = !current.flagged;
      next.set(questionId, { ...current, flagged });
      saveAnswer(questionId, { flagged });
      return next;
    });
  }

  const answeredCount = useMemo(
    () => Array.from(answers.values()).filter((a) => a.selectedOptionId).length,
    [answers],
  );
  const flaggedCount = useMemo(
    () => Array.from(answers.values()).filter((a) => a.flagged).length,
    [answers],
  );

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm font-medium">{error?.message ?? "This test is unavailable."}</p>
        {justRequested ? (
          <p className="text-sm text-muted-foreground">
            Request submitted — you can start this test once an admin approves it.
          </p>
        ) : error?.purchase && error.purchase.status !== "pending" ? (
          <PurchaseButton
            testSeriesId={error.purchase.testSeriesId}
            price={error.purchase.price}
            seriesTitle={error.purchase.title}
            rejected={error.purchase.status === "rejected"}
            onRequested={() => setJustRequested(true)}
          />
        ) : null}
        <Button variant="outline" onClick={() => router.push("/series")}>
          Back to My Tests
        </Button>
      </div>
    );
  }

  const question = payload.questions[index];
  const currentAnswer = answers.get(question.questionId);
  const unansweredCount = payload.questions.length - answeredCount;
  const lowTime = remainingSeconds <= 60;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{payload.test.title}</h1>
          {payload.test.titleTa ? (
            <p className="text-sm text-muted-foreground">{payload.test.titleTa}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums",
            lowTime
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-card text-foreground",
          )}
        >
          <Clock className="size-4" />
          {formatTime(remainingSeconds)}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Question {question.order} of {payload.questions.length} · {question.marks}m
              {payload.test.negativeMarking && question.negativeMarks > 0
                ? ` / -${question.negativeMarks}m`
                : ""}
            </p>
            <button
              type="button"
              onClick={() => toggleFlag(question.questionId)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                currentAnswer?.flagged
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Flag className="size-3.5" />
              {currentAnswer?.flagged ? "Flagged" : "Flag for review"}
            </button>
          </div>

          <div className="mt-3 text-base font-medium">
            <BilingualText value={question.question} />
          </div>

          <div className="mt-5 space-y-2.5">
            {question.options.map((option) => {
              const selected = currentAnswer?.selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(question.questionId, option.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {selected ? <Check className="size-3" /> : option.id.toUpperCase()}
                  </span>
                  <BilingualText value={option.text} />
                </button>
              );
            })}
          </div>

          {savingId === question.questionId ? (
            <p className="mt-3 text-xs text-muted-foreground">Saving…</p>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <Button
              disabled={index === payload.questions.length - 1}
              onClick={() => setIndex((i) => Math.min(payload.questions.length - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Questions
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {payload.questions.map((q, i) => {
                const a = answers.get(q.questionId);
                const isCurrent = i === index;
                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-md border text-xs font-semibold",
                      isCurrent && "ring-2 ring-primary ring-offset-1",
                      a?.selectedOptionId
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {q.order}
                    {a?.flagged ? (
                      <Flag className="absolute -top-1.5 -right-1.5 size-3 fill-amber-500 text-amber-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <p>{answeredCount} answered · {unansweredCount} unanswered</p>
              <p>{flaggedCount} flagged for review</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            {confirmSubmit ? (
              <div className="space-y-3">
                <p className="text-sm">
                  {unansweredCount > 0
                    ? `${unansweredCount} question${unansweredCount === 1 ? "" : "s"} unanswered. Submit anyway?`
                    : "Submit this test now?"}
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={submitting} onClick={finish}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : "Confirm submit"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={submitting}
                    onClick={() => setConfirmSubmit(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" onClick={() => setConfirmSubmit(true)}>
                Submit test
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
