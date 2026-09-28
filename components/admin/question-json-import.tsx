"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileJson, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";

type SyllabusOption = { _id: string; name: string };

const SAMPLE_QUESTIONS = [
  {
    type: "mcq_single",
    question: { en: "What is the capital of Tamil Nadu?", ta: "தமிழ்நாட்டின் தலைநகரம் எது?" },
    options: [
      { id: "A", text: { en: "Madurai", ta: "மதுரை" } },
      { id: "B", text: { en: "Chennai", ta: "சென்னை" } },
      { id: "C", text: { en: "Coimbatore", ta: "கோயம்புத்தூர்" } },
      { id: "D", text: { en: "Trichy", ta: "திருச்சி" } },
    ],
    correctAnswer: "B",
    explanation: { en: "Chennai is the capital of Tamil Nadu.", ta: "சென்னை தமிழ்நாட்டின் தலைநகரம்." },
    difficulty: "easy",
    tags: ["geography"],
    marks: 1,
    negativeMarks: 0.25,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
    difficulty: "easy",
  },
  {
    type: "true_false",
    question: "The Kaveri river flows through Tamil Nadu.",
    correctAnswer: "True",
  },
  {
    type: "integer",
    question: "How many districts does Tamil Nadu have (2024)?",
    correctAnswer: 38,
    difficulty: "medium",
  },
];

const FIELDS: { name: string; required?: boolean; desc: string }[] = [
  { name: "question", required: true, desc: 'Text, or { "en": "...", "ta": "..." } for Tamil too.' },
  { name: "type", desc: '"mcq_single" (default), "true_false" or "integer".' },
  {
    name: "options",
    desc: 'MCQ: 2+ options — plain strings (IDs A, B, C… assigned) or { "id", "text" }. True/False: optional, defaults to True / False. Integer: omit.',
  },
  {
    name: "correctAnswer",
    required: true,
    desc: "Option ID (\"B\") or the option's exact English text. Integer: a whole number.",
  },
  { name: "explanation", desc: "Text or { en, ta }. Shown after the test." },
  { name: "difficulty", desc: '"easy", "medium" (default) or "hard".' },
  { name: "subject", desc: "Topic name or ID. Falls back to the default topic below." },
  { name: "tags", desc: 'Array of strings, e.g. ["polity"].' },
  { name: "marks / negativeMarks", desc: "Override the marks set below for this one question." },
];

function downloadTemplate() {
  const blob = new Blob([JSON.stringify(SAMPLE_QUESTIONS, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "questions-template.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Accepts a bare array or { "questions": [...] }. */
function parseQuestions(text: string): { questions: unknown[] } | { error: string } {
  if (!text.trim()) return { error: "Paste JSON or choose a file first" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { error: `Invalid JSON: ${(err as Error).message}` };
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) {
    return { error: 'Expected an array of questions, or { "questions": [...] }' };
  }
  return { questions: list };
}

export function QuestionJsonImport({
  testId,
  subjects,
}: {
  testId: string;
  subjects: SyllabusOption[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [showFormat, setShowFormat] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0.25);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const parsed = text.trim() ? parseQuestions(text) : null;
  const count = parsed && "questions" in parsed ? parsed.questions.length : 0;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setMessage(null);
    setErrors([]);
  }

  async function runImport() {
    const result = parseQuestions(text);
    if ("error" in result) {
      setMessage({ tone: "error", text: result.error });
      setErrors([]);
      return;
    }
    setImporting(true);
    setMessage(null);
    setErrors([]);
    const res = await fetch(`/api/admin/tests/${testId}/questions/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: result.questions,
        subjectId: subjectId ?? undefined,
        marks,
        negativeMarks,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: data.error ?? "Import failed" });
      setErrors([...(data.errors ?? []), ...(data.more ? [`…and ${data.more} more`] : [])]);
      return;
    }
    setMessage({
      tone: "ok",
      text: `Imported ${data.added} question${data.added === 1 ? "" : "s"} into this test and the question bank.`,
    });
    setText("");
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            <FileJson className="size-3.5" /> Import questions from JSON
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a .json file or paste JSON. New questions are created in the question bank (published) and added
            to this test. If any question has a problem, nothing is imported.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFormat((v) => !v)}
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            {showFormat ? "Hide format" : "Show format"}
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            <Download className="size-3.5" /> Template
          </button>
        </div>
      </div>

      {showFormat ? (
        <div className="mt-3 grid gap-4 rounded-lg bg-muted/40 p-3 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold">Fields per question</p>
            <dl className="mt-2 space-y-1.5 text-xs">
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <dt className="inline font-mono font-medium">
                    {f.name}
                    {f.required ? <span className="text-destructive">*</span> : null}
                  </dt>{" "}
                  <dd className="inline text-muted-foreground">— {f.desc}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              The file can be an array of questions or <code className="font-mono">{'{ "questions": [...] }'}</code>.
              Up to 200 per import.
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Example</p>
              <button
                type="button"
                onClick={() => setText(JSON.stringify(SAMPLE_QUESTIONS, null, 2))}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Load into editor
              </button>
            </div>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(SAMPLE_QUESTIONS, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="json-import">Questions JSON</Label>
          <div className="flex items-center gap-2">
            {fileName ? <span className="truncate text-xs text-muted-foreground">{fileName}</span> : null}
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
            >
              <Upload className="size-3.5" /> Choose file
            </button>
          </div>
        </div>
        <Textarea
          id="json-import"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
          }}
          placeholder='[ { "question": "...", "options": ["...", "..."], "correctAnswer": "A" } ]'
          spellCheck={false}
          className="max-h-80 min-h-32 overflow-auto font-mono text-xs"
          aria-invalid={parsed !== null && "error" in parsed}
        />
        <p className={`text-xs ${parsed && "error" in parsed ? "text-destructive" : "text-muted-foreground"}`}>
          {parsed === null
            ? "No JSON yet."
            : "error" in parsed
              ? parsed.error
              : `${count} question${count === 1 ? "" : "s"} found.`}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="import-subject">Default topic</Label>
          <SearchableSelect
            id="import-subject"
            options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            value={subjectId ?? ""}
            onValueChange={(v) => setSubjectId(v || null)}
            placeholder="Search topics… (none)"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="import-marks">Marks each</Label>
          <Input
            id="import-marks"
            type="number"
            step="0.5"
            min={0}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            className="h-9 rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="import-neg">Negative each</Label>
          <Input
            id="import-neg"
            type="number"
            step="0.05"
            min={0}
            value={negativeMarks}
            onChange={(e) => setNegativeMarks(Number(e.target.value))}
            className="h-9 rounded-lg"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runImport}
          disabled={importing || count === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Import {count > 0 ? `${count} ` : ""}question{count === 1 ? "" : "s"}
        </button>
        {message ? (
          <p
            className={
              message.tone === "error"
                ? "text-sm font-medium text-destructive"
                : "text-sm font-medium text-emerald-600"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <ul className="mt-2 max-h-48 list-disc space-y-0.5 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 py-2 pr-3 pl-7 text-xs text-destructive">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
