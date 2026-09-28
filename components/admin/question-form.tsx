"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { VoiceInput, VoiceTextarea } from "@/components/ui/voice-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; text: { en: string; ta: string } };

type RefOption = { value: string; label: string };

type Language = "both" | "en" | "ta";

const LANGUAGE_LABELS: Record<Language, string> = {
  both: "English + Tamil",
  en: "English only",
  ta: "Tamil only",
};

const LANGUAGE_NAMES = { en: "English", ta: "Tamil" } as const;

/** Picks the language an existing question was written in (new questions default to both). */
function detectLanguage(values: { questionEn: string; questionTa: string; options: Option[] }): Language {
  const hasEn = Boolean(values.questionEn.trim()) || values.options.some((o) => o.text.en.trim());
  const hasTa = Boolean(values.questionTa.trim()) || values.options.some((o) => o.text.ta.trim());
  if (hasEn && !hasTa) return "en";
  if (hasTa && !hasEn) return "ta";
  return "both";
}

export function QuestionForm({
  id,
  initial,
  subjects,
  onSaved,
  onCancel,
  lockSubject = false,
}: {
  id?: string;
  initial: {
    type: string;
    questionEn: string;
    questionTa: string;
    options: Option[];
    correctAnswer: string;
    explanationEn: string;
    explanationTa: string;
    difficulty: string;
    subjectId: string;
    tags: string;
    status: string;
  };
  subjects: RefOption[];
  /** Embedded use (e.g. in a dialog): called after a successful save instead of navigating away. */
  onSaved?: () => void;
  onCancel?: () => void;
  /** Hides the topic picker and keeps `initial.subjectId` (e.g. when adding from a topic's page). */
  lockSubject?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [language, setLanguage] = useState<Language>(() => detectLanguage(initial));
  const [error, setError] = useState<string | null>(null);
  const showEn = language !== "ta";
  const showTa = language !== "en";
  const hasOptions = values.type !== "integer";
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateOption(index: number, patch: Partial<Option>) {
    setValues((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, ...patch, text: { ...opt.text, ...patch.text } } : opt,
      ),
    }));
  }

  function addOption() {
    const nextId = String.fromCharCode(65 + values.options.length); // A, B, C...
    setValues((prev) => ({
      ...prev,
      options: [...prev.options, { id: nextId, text: { en: "", ta: "" } }],
    }));
  }

  function removeOption(index: number) {
    setValues((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // The chosen language(s) must be filled in for the question and every option.
    const required = language === "both" ? (["en", "ta"] as const) : [language];
    const question = { en: values.questionEn.trim(), ta: values.questionTa.trim() };
    for (const lang of required) {
      if (!question[lang]) {
        setError(`Question (${LANGUAGE_NAMES[lang]}) is required`);
        return;
      }
      const blank = hasOptions ? values.options.find((o) => !o.text[lang].trim()) : undefined;
      if (blank) {
        setError(`Option ${blank.id || "?"} (${LANGUAGE_NAMES[lang]}) is required`);
        return;
      }
    }

    // Text in a language that wasn't chosen is dropped, so the saved question matches the choice.
    const keep = (text: { en: string; ta: string }) => ({
      en: showEn ? text.en : "",
      ta: showTa ? text.ta : "",
    });

    setLoading(true);
    const payload = {
      type: values.type,
      language,
      question: keep(question),
      options: hasOptions ? values.options.map((o) => ({ ...o, text: keep(o.text) })) : [],
      correctAnswer: values.correctAnswer,
      explanation: keep({ en: values.explanationEn, ta: values.explanationTa }),
      difficulty: values.difficulty,
      subjectId: values.subjectId || undefined,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: values.status,
    };

    const url = id ? `/api/admin/questions/${id}` : "/api/admin/questions";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    if (onSaved) {
      onSaved();
      return;
    }
    router.push("/admin/questions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={onSaved ? undefined : "max-w-2xl"}>
      {onSaved ? null : (
        <h1 className="text-2xl font-bold tracking-tight">
          {id ? "Edit Question" : "New Question"}
        </h1>
      )}

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="h-10 w-full rounded-lg">
                <SelectValue>{(v: Language) => LANGUAGE_LABELS[v]}</SelectValue>
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
            <Select value={values.type} onValueChange={(v) => set("type", v as string)}>
              <SelectTrigger className="h-10 w-full rounded-lg">
                <SelectValue />
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
            <Select
              value={values.difficulty}
              onValueChange={(v) => set("difficulty", v as string)}
            >
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
        </div>

        <div className={`grid grid-cols-1 gap-4 ${language === "both" ? "sm:grid-cols-2" : ""}`}>
          {showEn ? (
            <div className="space-y-1.5">
              <Label htmlFor="questionEn">
                Question (English) <span className="text-destructive">*</span>
              </Label>
              <VoiceTextarea
                id="questionEn"
                required
                value={values.questionEn}
                onChange={(e) => set("questionEn", e.target.value)}
                className="rounded-lg"
              />
            </div>
          ) : null}
          {showTa ? (
            <div className="space-y-1.5">
              <Label htmlFor="questionTa">
                Question (Tamil) <span className="text-destructive">*</span>
              </Label>
              <VoiceTextarea
                id="questionTa"
                voiceLang="ta-IN"
                required
                value={values.questionTa}
                onChange={(e) => set("questionTa", e.target.value)}
                className="rounded-lg"
              />
            </div>
          ) : null}
        </div>

        {hasOptions ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Add option
              </button>
            </div>
            {values.options.map((opt, index) => (
              <div key={index} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <Input
                  value={opt.id}
                  onChange={(e) => updateOption(index, { id: e.target.value })}
                  className="h-10 w-16 rounded-lg text-center"
                  placeholder="ID"
                />
                {showEn ? (
                  <VoiceInput
                    required
                    value={opt.text.en}
                    onChange={(e) => updateOption(index, { text: { ...opt.text, en: e.target.value } })}
                    className="h-10 flex-1 rounded-lg"
                    placeholder="Option (English)"
                    aria-label={`Option ${opt.id} (English)`}
                  />
                ) : null}
                {showTa ? (
                  <VoiceInput
                    required
                    voiceLang="ta-IN"
                    value={opt.text.ta}
                    onChange={(e) => updateOption(index, { text: { ...opt.text, ta: e.target.value } })}
                    className="h-10 flex-1 rounded-lg"
                    placeholder="Option (Tamil)"
                    aria-label={`Option ${opt.id} (Tamil)`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="mt-2 text-muted-foreground hover:text-destructive"
                  aria-label="Remove option"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="correctAnswer">
            Correct answer {values.type !== "integer" ? "(option ID)" : ""}
          </Label>
          <VoiceInput
            id="correctAnswer"
            required
            value={values.correctAnswer}
            onChange={(e) => set("correctAnswer", e.target.value)}
            className="h-10 rounded-lg"
            placeholder={values.type === "integer" ? "42" : "A"}
          />
        </div>

        <div className={`grid grid-cols-1 gap-4 ${language === "both" ? "sm:grid-cols-2" : ""}`}>
          {showEn ? (
            <div className="space-y-1.5">
              <Label htmlFor="explanationEn">Explanation (English)</Label>
              <VoiceTextarea
                id="explanationEn"
                value={values.explanationEn}
                onChange={(e) => set("explanationEn", e.target.value)}
                className="rounded-lg"
              />
            </div>
          ) : null}
          {showTa ? (
            <div className="space-y-1.5">
              <Label htmlFor="explanationTa">Explanation (Tamil)</Label>
              <VoiceTextarea
                id="explanationTa"
                voiceLang="ta-IN"
                value={values.explanationTa}
                onChange={(e) => set("explanationTa", e.target.value)}
                className="rounded-lg"
              />
            </div>
          ) : null}
        </div>

        {lockSubject ? null : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Topic</Label>
              <SearchableSelect
                id="subjectId"
                options={subjects}
                value={values.subjectId}
                onValueChange={(v) => set("subjectId", v)}
                placeholder="Search topics… (none)"
                className="h-10"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <VoiceInput
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              className="h-10 rounded-lg"
              placeholder="polity, constitution"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as string)}>
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
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/questions">Cancel</Link>}
          />
        )}
      </div>
    </form>
  );
}
