"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuestionOcrExtract } from "@/components/admin/question-ocr-extract";
import { QUESTION_JSON_KEYS } from "@/src/modules/questions/schemas";

type Target = "test" | "bank";

const TARGETS: { value: Target; label: string; hint: string }[] = [
  { value: "test", label: "Test import", hint: "All fields: type, difficulty, topic, tags" },
  { value: "bank", label: "Question Bank import", hint: "Only question, options, answer, explanation" },
];

/** The Question Bank import rejects any other key. */
function formatFor(questions: Record<string, unknown>[], target: Target) {
  const list =
    target === "bank"
      ? questions.map((q) =>
          Object.fromEntries(
            Object.entries(q).filter(([k]) => (QUESTION_JSON_KEYS as readonly string[]).includes(k)),
          ),
        )
      : questions;
  return JSON.stringify(list, null, 2);
}

/** Admin tool: question paper (PDF / images) → JSON for the question imports. */
export function QuestionOcrPage() {
  const [questions, setQuestions] = useState<Record<string, unknown>[] | null>(null);
  const [target, setTarget] = useState<Target>("test");
  const [json, setJson] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function changeTarget(next: Target) {
    setTarget(next);
    if (questions) setJson(formatFor(questions, next));
  }

  async function copy() {
    await navigator.clipboard.writeText(json).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(source ?? "questions").replace(/\.[^.]+$/, "").replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">OCR Extract</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a question paper as PDF or images — read it with AI or with free plain OCR. The questions, options and answers come out as JSON that you can
        check, then import from the{" "}
        <Link href="/admin/questions/import" className="font-medium text-primary hover:text-primary/80">
          Question Bank
        </Link>{" "}
        or a test&apos;s JSON import.
      </p>

      <div className="mt-6">
        <QuestionOcrExtract
          onExtracted={(extracted, from) => {
            setQuestions(extracted);
            setJson(formatFor(extracted, target));
            setSource(from);
          }}
        />
      </div>

      <div className="mt-6 space-y-1.5">
        <Label>JSON for</Label>
        <div className="flex flex-wrap gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => changeTarget(t.value)}
              aria-pressed={target === t.value}
              className={`rounded-lg border px-3 py-1.5 text-left text-xs ${
                target === t.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
            >
              <span className="block font-medium">{t.label}</span>
              <span className="block text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>
        {questions ? (
          <p className="text-xs text-muted-foreground">Switching this rebuilds the JSON and discards edits.</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="ocr-json">Extracted JSON {source ? <span className="font-normal text-muted-foreground">— {source}</span> : null}</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!json}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={download}
              disabled={!json}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              <Download className="size-3.5" /> Download .json
            </button>
          </div>
        </div>
        <Textarea
          id="ocr-json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          placeholder="The extracted questions appear here. You can edit them before copying or downloading."
          className="h-112 resize-y overflow-auto rounded-lg font-mono text-xs field-sizing-fixed"
        />
      </div>
    </div>
  );
}
