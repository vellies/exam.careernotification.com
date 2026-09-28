"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/ui/voice-input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonQuestion, type QuestionLanguage } from "@/src/modules/questions/schemas";

type RefOption = { value: string; label: string };
type QuestionType = "mcq_single" | "true_false" | "integer";
type Difficulty = "easy" | "medium" | "hard";

/** The exact JSON structure for each question type, used as the example. */
const EXAMPLES: Record<QuestionType, unknown[]> = {
  mcq_single: [
    {
      question: { en: "What is the capital of Tamil Nadu?", ta: "தமிழ்நாட்டின் தலைநகரம் எது?" },
      options: [
        { id: "A", text: { en: "Madurai", ta: "மதுரை" } },
        { id: "B", text: { en: "Chennai", ta: "சென்னை" } },
        { id: "C", text: { en: "Coimbatore", ta: "கோயம்புத்தூர்" } },
        { id: "D", text: { en: "Tiruchirappalli", ta: "திருச்சிராப்பள்ளி" } },
      ],
      correctAnswer: "B",
      explanation: {
        en: "Chennai is the capital of Tamil Nadu.",
        ta: "சென்னை தமிழ்நாட்டின் தலைநகரம் ஆகும்.",
      },
    },
    {
      question: { en: "Which river is called the Ganga of the South?", ta: "தென்னகத்தின் கங்கை என அழைக்கப்படும் ஆறு எது?" },
      options: [
        { id: "A", text: { en: "Vaigai", ta: "வைகை" } },
        { id: "B", text: { en: "Thamirabarani", ta: "தாமிரபரணி" } },
        { id: "C", text: { en: "Kaveri", ta: "காவிரி" } },
        { id: "D", text: { en: "Palar", ta: "பாலாறு" } },
      ],
      correctAnswer: "C",
      explanation: {
        en: "The Kaveri is known as the Dakshina Ganga (Ganga of the South).",
        ta: "காவிரி ஆறு தட்சிண கங்கை (தென்னகத்தின் கங்கை) என அழைக்கப்படுகிறது.",
      },
    },
  ],
  true_false: [
    {
      question: { en: "The Kaveri river flows through Tamil Nadu.", ta: "காவிரி ஆறு தமிழ்நாட்டின் வழியாகப் பாய்கிறது." },
      options: [
        { id: "A", text: { en: "True", ta: "சரி" } },
        { id: "B", text: { en: "False", ta: "தவறு" } },
      ],
      correctAnswer: "A",
      explanation: {
        en: "The Kaveri flows from Karnataka into Tamil Nadu.",
        ta: "காவிரி கர்நாடகத்திலிருந்து தமிழ்நாட்டிற்குள் பாய்கிறது.",
      },
    },
  ],
  integer: [
    {
      question: { en: "How many districts does Tamil Nadu have (2024)?", ta: "தமிழ்நாட்டில் எத்தனை மாவட்டங்கள் உள்ளன (2024)?" },
      correctAnswer: "38",
      explanation: {
        en: "Tamil Nadu has 38 districts.",
        ta: "தமிழ்நாட்டில் 38 மாவட்டங்கள் உள்ளன.",
      },
    },
  ],
};

const LANGUAGE_LABELS: Record<QuestionLanguage, string> = {
  both: "English + Tamil",
  en: "English only",
  ta: "Tamil only",
};

/** How a text field looks in the chosen language, e.g. { "en": "...", "ta": "..." }. */
const TEXT_SHAPE: Record<QuestionLanguage, string> = {
  both: '{ "en", "ta" }',
  en: '{ "en" }',
  ta: '{ "ta" }',
};

const TEXT_REQUIRED: Record<QuestionLanguage, string> = {
  both: "Both English and Tamil are required",
  en: "English is required (any Tamil text is ignored)",
  ta: "Tamil is required (any English text is ignored)",
};

function rulesFor(type: QuestionType, language: QuestionLanguage) {
  const text = TEXT_SHAPE[language];
  const required = TEXT_REQUIRED[language];
  return [
    `question — ${text}. ${required}.`,
    type === "mcq_single"
      ? `options — 2 or more, each { "id", "text": ${text} }. IDs must be unique (A, B, C, D). ${required}.`
      : type === "true_false"
        ? "options — exactly as shown (A = True, B = False). Optional: left out, the same two are used."
        : "No options field.",
    type === "integer"
      ? 'correctAnswer — a whole number as text, e.g. "38".'
      : type === "true_false"
        ? 'correctAnswer — "A" for True or "B" for False.'
        : 'correctAnswer — the ID of the correct option, e.g. "B".',
    `explanation — ${text}. Optional.`,
  ];
}

/** Keeps only the chosen language's keys in every { en, ta } of the example. */
function exampleFor(type: QuestionType, language: QuestionLanguage) {
  if (language === "both") return EXAMPLES[type];
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("en" in obj && "ta" in obj) return { [language]: obj[language] };
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, strip(v)]));
    }
    return value;
  };
  return strip(EXAMPLES[type]) as unknown[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq_single: "Single-answer MCQ",
  true_false: "True / False",
  integer: "Integer answer",
};

type Preview =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      rows: ReturnType<typeof parseJsonQuestion>[];
      raw: unknown[];
    };

export function QuestionBulkImportForm({
  subjects,
  topic,
}: {
  subjects: RefOption[];
  /** Imports straight into this topic: the topic picker is hidden and the page returns to the topic. */
  topic?: { id: string; name: string };
}) {
  const router = useRouter();
  const backHref = topic ? `/admin/syllabus/subjects/${topic.id}/questions` : "/admin/questions";
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<QuestionType>("mcq_single");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [language, setLanguage] = useState<QuestionLanguage>("both");
  const [subjectId, setSubjectId] = useState(topic?.id ?? "");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("published");
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const tagList = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags],
  );
  const example = JSON.stringify(exampleFor(type, language), null, 2);

  const preview = useMemo<Preview>(() => {
    if (!json.trim()) return { kind: "empty" };
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (err) {
      return { kind: "error", message: `Invalid JSON: ${(err as Error).message}` };
    }
    if (!Array.isArray(data)) {
      return { kind: "error", message: "The JSON must be an array: [ { ... }, { ... } ]" };
    }
    if (data.length === 0) return { kind: "error", message: "The array is empty." };
    return {
      kind: "ok",
      raw: data,
      rows: data.map((raw) => parseJsonQuestion(raw, { type, difficulty, tags: tagList, language })),
    };
  }, [json, type, difficulty, tagList, language]);

  const total = preview.kind === "ok" ? preview.rows.length : 0;
  const invalid = preview.kind === "ok" ? preview.rows.filter((r) => !r.ok).length : 0;
  const canSave = preview.kind === "ok" && invalid === 0 && !saving;

  async function copyExample() {
    await navigator.clipboard.writeText(example).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setJson(await file.text());
    setError(null);
    setServerErrors([]);
  }

  async function save() {
    if (preview.kind !== "ok") return;
    setSaving(true);
    setError(null);
    setServerErrors([]);
    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: preview.raw,
        type,
        difficulty,
        language,
        subjectId: subjectId || undefined,
        tags: tagList,
        status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setServerErrors([...(data.errors ?? []), ...(data.more ? [`…and ${data.more} more`] : [])]);
      return;
    }
    router.push(backHref);
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {topic ? `Back to ${topic.name}` : "Back to Question Bank"}
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        {topic ? `Import Questions into ${topic.name}` : "Import Questions from JSON"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste the questions, options, answers and explanations as JSON. The settings below apply to every question.
      </p>

      {/* Settings applied to every question */}
      <div className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as QuestionLanguage)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue>{(v: QuestionLanguage) => LANGUAGE_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">English + Tamil</SelectItem>
              <SelectItem value="en">English only</SelectItem>
              <SelectItem value="ta">Tamil only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue>{(v: QuestionType) => TYPE_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq_single">Single-answer MCQ</SelectItem>
              <SelectItem value="true_false">True / False</SelectItem>
              <SelectItem value="integer">Integer answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {topic ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="subjectId">Topic</Label>
            <SearchableSelect
              id="subjectId"
              options={subjects}
              value={subjectId}
              onValueChange={setSubjectId}
              placeholder="Search topics… (none)"
              className="h-10"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <VoiceInput
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="h-10 rounded-lg"
            placeholder="polity, constitution"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as string)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* JSON input */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="json">Questions JSON</Label>
            <div className="flex items-center gap-2">
              {fileName ? <span className="max-w-40 truncate text-xs text-muted-foreground">{fileName}</span> : null}
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
                <Upload className="size-3.5" /> Upload .json
              </button>
            </div>
          </div>
          <Textarea
            id="json"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setFileName(null);
            }}
            spellCheck={false}
            placeholder={'[\n  {\n    "question": { "en": "...", "ta": "..." },\n    ...\n  }\n]'}
            aria-invalid={preview.kind === "error" || invalid > 0}
            className="h-[28rem] resize-y overflow-auto rounded-lg font-mono text-xs [field-sizing:fixed]"
          />
          <p
            className={`text-xs ${
              preview.kind === "error" || invalid > 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {preview.kind === "empty"
              ? "Paste a JSON array, or upload a .json file."
              : preview.kind === "error"
                ? preview.message
                : invalid > 0
                  ? `${total} questions found — ${invalid} need fixing (see preview below).`
                  : `${total} question${total === 1 ? "" : "s"} ready to save.`}
          </p>
        </div>

        {/* Exact structure */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Exact JSON structure — {TYPE_LABELS[type]}, {LANGUAGE_LABELS[language]}</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyExample}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setJson(example);
                  setFileName(null);
                }}
                className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
              >
                Use example
              </button>
            </div>
          </div>
          <pre className="h-[20rem] overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            {example}
          </pre>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {rulesFor(type, language).map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>Wrap all questions in one array [ ... ]. Up to 500 per save. No other fields are allowed.</li>
          </ul>
        </div>
      </div>

      {/* Preview */}
      {preview.kind === "ok" ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Preview ({total})
          </h2>
          <ol className="mt-3 divide-y divide-border rounded-lg border border-border">
            {preview.rows.map((row, i) => (
              <li key={i} className="px-4 py-3">
                <div className="flex gap-3">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  {row.ok ? (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{row.data.question.en || row.data.question.ta}</p>
                      {row.data.question.en && row.data.question.ta ? (
                        <p className="text-sm text-muted-foreground">{row.data.question.ta}</p>
                      ) : null}
                      {row.data.options.length > 0 ? (
                        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                          {row.data.options.map((o) => {
                            const correct = o.id === row.data.correctAnswer;
                            return (
                              <li
                                key={o.id}
                                className={`rounded-md border px-2 py-1 text-xs ${
                                  correct
                                    ? "border-emerald-500/50 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
                                    : "border-border"
                                }`}
                              >
                                <span className="font-mono">{o.id}.</span> {o.text.en || o.text.ta}
                                {o.text.en && o.text.ta ? <span className="text-muted-foreground"> / {o.text.ta}</span> : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs">
                          Answer: <span className="font-medium text-emerald-700 dark:text-emerald-400">{row.data.correctAnswer}</span>
                        </p>
                      )}
                      {row.data.explanation.en || row.data.explanation.ta ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Explanation:</span>{" "}
                          {[row.data.explanation.en, row.data.explanation.ta].filter(Boolean).join(" / ")}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="min-w-0 flex-1 space-y-0.5 text-xs text-destructive">
                      {row.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
      {serverErrors.length > 0 ? (
        <ul className="mt-2 max-h-48 list-disc space-y-0.5 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 py-2 pr-3 pl-7 text-xs text-destructive">
          {serverErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={save} disabled={!canSave}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `Save ${total > 0 ? `${total} ` : ""}question${total === 1 ? "" : "s"}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={backHref}>Cancel</Link>}
        />
      </div>
    </div>
  );
}
