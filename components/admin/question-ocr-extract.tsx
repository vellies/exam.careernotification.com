"use client";

import { useRef, useState } from "react";
import { Loader2, ScanText, Sparkles } from "lucide-react";
import { parseQuestionText } from "@/src/modules/questions/ocr-parse";

type Mode = "ai" | "plain";

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "ai",
    label: "With AI",
    hint: "Most accurate. Handles any layout and can answer questions with no answer key. Uses the Claude API.",
  },
  {
    value: "plain",
    label: "Without AI",
    hint: 'Free, runs in your browser. Needs numbered questions, lettered options ("(A)", "அ)") and "Answer:" lines or an answer key.',
  },
];

/**
 * Upload a question paper (PDF or photos) and read it into the JSON import
 * format, with AI or with plain OCR. Nothing is saved here.
 */
export function QuestionOcrExtract({
  onExtracted,
}: {
  onExtracted: (questions: Record<string, unknown>[], source: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("ai");
  const [inferAnswers, setInferAnswers] = useState(true);
  const [forceOcr, setForceOcr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  async function extractWithAi(files: File[]) {
    const body = new FormData();
    for (const f of files) body.append("files", f);
    body.append("inferAnswers", String(inferAnswers));

    const res = await fetch("/api/admin/questions/extract", { method: "POST", body }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) throw new Error(data.error ?? "Extraction failed — try again");
    return { questions: data.questions as Record<string, unknown>[], warnings: (data.warnings ?? []) as string[] };
  }

  async function extractPlain(files: File[]) {
    const { readFilesText } = await import("@/components/admin/ocr-browser");
    const text = await readFilesText(files, { forceOcr, progress: setProgress });
    setRawText(text);
    const result = parseQuestionText(text);
    if (result.questions.length === 0) {
      throw new Error('No numbered questions found. Check the raw text below, or try "With AI".');
    }
    return result;
  }

  async function run(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setProgress(null);
    setError(null);
    setWarnings([]);
    setDone(null);
    setRawText(null);

    try {
      const result = mode === "ai" ? await extractWithAi(files) : await extractPlain(files);
      const source = files.length === 1 ? files[0].name : `${files.length} files`;
      onExtracted(result.questions, source);
      setWarnings(result.warnings);
      const count = result.questions.length;
      setDone(`Extracted ${count} question${count === 1 ? "" : "s"} from ${source}. Review the JSON before importing.`);
    } catch (err) {
      setError((err as Error).message || "Extraction failed — try again");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <ScanText className="size-4" /> Extract from PDF or image
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Reads a question paper (English and/or Tamil) into JSON. PDF, PNG, JPG or WEBP — several page photos at once
        is fine.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            disabled={busy}
            aria-pressed={mode === m.value}
            className={`rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-50 ${
              mode === m.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-1 font-medium">
              {m.value === "ai" ? <Sparkles className="size-3.5" /> : <ScanText className="size-3.5" />} {m.label}
            </span>
            <span className="mt-0.5 block text-muted-foreground">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {mode === "ai" ? (
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={inferAnswers}
              onChange={(e) => setInferAnswers(e.target.checked)}
              disabled={busy}
              className="size-3.5 accent-primary"
            />
            Let AI answer questions with no answer key
          </label>
        ) : (
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={forceOcr}
              onChange={(e) => setForceOcr(e.target.checked)}
              disabled={busy}
              className="size-3.5 accent-primary"
            />
            OCR every PDF page (use if Tamil text comes out garbled)
          </label>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => run(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ScanText className="size-3.5" />}
          {busy ? "Reading…" : "Choose PDF / images"}
        </button>
      </div>

      {busy ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {progress ?? (mode === "ai" ? "AI is reading the paper — this can take a minute or two…" : "Starting…")}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}
      {done ? <p className="mt-2 text-xs font-medium text-emerald-600">{done}</p> : null}
      {warnings.length > 0 ? (
        <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto rounded-lg border border-amber-500/30 bg-amber-500/5 py-2 pr-3 pl-7 text-xs text-amber-700 dark:text-amber-400">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
      {rawText !== null ? (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show raw OCR text</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] whitespace-pre-wrap">
            {rawText}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
