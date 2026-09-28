"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Shuffle } from "lucide-react";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Label } from "@/components/ui/label";
import { VoiceInput } from "@/components/ui/voice-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttachedQuestion = {
  questionId:
    | {
        _id: string;
        question?: { en: string; ta?: string };
        difficulty?: string;
      }
    | string;
  order: number;
  marks: number;
  negativeMarks: number;
};

type SearchResult = {
  _id: string;
  question: { en: string; ta?: string };
  difficulty: string;
  status: string;
};

type SyllabusOption = { _id: string; name: string };

export function TestQuestionBuilder({
  testId,
  attached,
  shuffleQuestions: initialShuffle,
  syllabus,
}: {
  testId: string;
  attached: AttachedQuestion[];
  shuffleQuestions: boolean;
  syllabus: {
    subjects: SyllabusOption[];
  };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [autoMarks, setAutoMarks] = useState(1);
  const [autoNegativeMarks, setAutoNegativeMarks] = useState(0.25);
  const [autoFilling, setAutoFilling] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialShuffle);
  const [savingShuffle, setSavingShuffle] = useState(false);
  const [shuffleError, setShuffleError] = useState<string | null>(null);
  const [autoFillMessage, setAutoFillMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const attachedIds = new Set(
    attached.map((a) =>
      typeof a.questionId === "string" ? a.questionId : a.questionId._id,
    ),
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({ status: "published", limit: "20" });
      if (query.trim()) params.set("q", query.trim());
      try {
        const res = await fetch(`/api/admin/questions?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.items ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  async function addQuestion(questionId: string) {
    setBusyId(questionId);
    await fetch(`/api/admin/tests/${testId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, marks: 1, negativeMarks: 0.25 }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function toggleShuffle(next: boolean) {
    setShuffleQuestions(next);
    setSavingShuffle(true);
    setShuffleError(null);
    const res = await fetch(`/api/admin/tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shuffleQuestions: next }),
    });
    setSavingShuffle(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setShuffleQuestions(!next);
      setShuffleError(data.error ?? "Couldn't save the shuffle setting");
    }
  }

  async function autoFill() {
    setAutoFilling(true);
    setAutoFillMessage(null);
    const res = await fetch(`/api/admin/tests/${testId}/questions/auto-fill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: subjectId ?? undefined,
        difficulty: difficulty ?? undefined,
        count,
        marks: autoMarks,
        negativeMarks: autoNegativeMarks,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setAutoFilling(false);
    if (!res.ok) {
      setAutoFillMessage({
        tone: "error",
        text: data.error ?? "Auto-fill failed",
      });
      return;
    }
    setAutoFillMessage({
      tone: "ok",
      text:
        data.added < data.requested
          ? `Added ${data.added} of ${data.requested} requested — only that many matched.`
          : `Added ${data.added} random question${data.added === 1 ? "" : "s"}.`,
    });
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-border px-3 py-2.5">
        <h2
          className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          title="Matching published questions are picked at random from the question bank."
        >
          <Shuffle className="size-3.5" /> Auto-fill from syllabus
        </h2>

        <div className="mt-2 grid items-end gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_5.5rem_5.5rem_5.5rem_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Topic</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v as string)}
            >
              <SelectTrigger className="h-9 w-full rounded-lg">
                <SelectValue placeholder="Any topic">
                  {(value: string | null) =>
                    value
                      ? (syllabus.subjects.find((s) => s._id === value)?.name ??
                        value)
                      : "Any topic"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {syllabus.subjects.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as string)}
            >
              <SelectTrigger className="h-9 w-full rounded-lg">
                <SelectValue placeholder="Any difficulty">
                  {(value: string | null) =>
                    value
                      ? value.charAt(0).toUpperCase() + value.slice(1)
                      : "Any difficulty"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="auto-count" className="text-xs">Count</Label>
            <VoiceInput
              id="auto-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-9 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="auto-marks" className="text-xs">Marks</Label>
            <VoiceInput
              id="auto-marks"
              type="number"
              step="0.5"
              min={0}
              value={autoMarks}
              onChange={(e) => setAutoMarks(Number(e.target.value))}
              className="h-9 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="auto-neg" className="text-xs">Negative</Label>
            <VoiceInput
              id="auto-neg"
              type="number"
              step="0.05"
              min={0}
              value={autoNegativeMarks}
              onChange={(e) => setAutoNegativeMarks(Number(e.target.value))}
              className="h-9 rounded-lg"
            />
          </div>

          <button
            type="button"
            onClick={autoFill}
            disabled={autoFilling || count < 1}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium whitespace-nowrap text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {autoFilling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Shuffle className="size-4" />
            )}
            Auto-fill {count}
          </button>
        </div>

        {autoFillMessage ? (
          <p
            className={
              autoFillMessage.tone === "error"
                ? "mt-2 text-sm font-medium text-destructive"
                : "mt-2 text-sm font-medium text-emerald-600"
            }
          >
            {autoFillMessage.text}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              In this test ({attached.length})
            </h2>
            <label className="flex items-center gap-2 text-sm font-medium">
              {savingShuffle ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Shuffle className="size-3.5 text-muted-foreground" />
              )}
              Shuffle questions
              <Switch
                checked={shuffleQuestions}
                disabled={savingShuffle}
                onCheckedChange={(v) => toggleShuffle(v)}
              />
            </label>
          </div>
          <p
            className={`mt-1 text-xs ${shuffleError ? "text-destructive" : "text-muted-foreground"}`}
          >
            {shuffleError ??
              (shuffleQuestions
                ? "Each student gets these questions in a different random order."
                : "Every student sees the questions in the order below.")}
          </p>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {attached.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No questions added yet.
              </p>
            ) : (
              attached
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item) => {
                  const q =
                    typeof item.questionId === "string"
                      ? null
                      : item.questionId;
                  const qId =
                    typeof item.questionId === "string"
                      ? item.questionId
                      : item.questionId._id;
                  return (
                    <div
                      key={qId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="text-xs text-muted-foreground">
                        {item.order}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm">
                          {q?.question?.en || q?.question?.ta || qId}
                        </p>
                        {q?.question?.en && q.question.ta ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {q.question.ta}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.marks}m
                      </span>
                      <DeleteRowButton
                        url={`/api/admin/tests/${testId}/questions/${qId}`}
                        title="Remove this question from the test?"
                        confirmLabel="The question stays in the question bank — it's only taken out of this test."
                        actionLabel="Remove"
                      />
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Add published questions
          </h2>
          <div className="relative mt-3">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <VoiceInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-10 rounded-lg pl-9"
            />
          </div>
          <div className="mt-3 max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {searching ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No published questions found.
              </p>
            ) : (
              results.map((q) => {
                const already = attachedIds.has(q._id);
                return (
                  <div
                    key={q._id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">
                        {q.question.en || q.question.ta}
                      </p>
                      {q.question.en && q.question.ta ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {q.question.ta}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {q.difficulty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addQuestion(q._id)}
                      disabled={already || busyId === q._id}
                      className="text-primary hover:text-primary/80 disabled:text-muted-foreground/50"
                      aria-label="Add"
                    >
                      {busyId === q._id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
