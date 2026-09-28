"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/ui/voice-input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RefOption = { value: string; label: string; endDate?: string };

export function TestForm({
  id,
  initial,
  testSeriesOptions,
  backHref,
}: {
  id?: string;
  initial: {
    title: string;
    titleTa: string;
    testSeriesId: string;
    durationSeconds: number;
    negativeMarking: boolean;
    defaultNegativeMarks: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    opensAt: string;
    closesAt: string;
    status: string;
  };
  testSeriesOptions: RefOption[];
  backHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  // A test belongs to the series it was created under (or opened from) — the
  // series can't be changed here.
  const seriesLocked = Boolean(id) || Boolean(initial.testSeriesId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const url = id ? `/api/admin/tests/${id}` : "/api/admin/tests";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : null,
        closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push(
      id
        ? `/admin/tests/${id}/questions`
        : `/admin/tests?testSeriesId=${values.testSeriesId}`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">
        {id ? "Edit Test" : "New Test"}
      </h1>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <VoiceInput
            id="title"
            required
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-10 rounded-lg"
            placeholder="Mock Test 01"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="titleTa">Title (Tamil)</Label>
          <VoiceInput
            id="titleTa"
            voiceLang="ta-IN"
            value={values.titleTa}
            onChange={(e) => set("titleTa", e.target.value)}
            className="h-10 rounded-lg"
            placeholder="மாதிரி தேர்வு 01"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="testSeriesId">Test series</Label>
          <SearchableSelect
            id="testSeriesId"
            disabled={seriesLocked}
            clearable={false}
            options={testSeriesOptions}
            value={values.testSeriesId}
            placeholder="Search test series…"
            className="h-10"
            onValueChange={(v) => {
              if (!v) return;
              set("testSeriesId", v);
              // New tests default their end to the chosen series' end.
              const seriesEnd = testSeriesOptions.find((o) => o.value === v)?.endDate;
              if (!id && seriesEnd) set("closesAt", seriesEnd);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <VoiceInput
              id="duration"
              type="number"
              value={Math.round(values.durationSeconds / 60)}
              onChange={(e) => set("durationSeconds", Number(e.target.value) * 60)}
              className="h-10 rounded-lg"
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

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Negative marking</p>
            <p className="text-xs text-muted-foreground">
              Deduct marks for wrong answers.
            </p>
          </div>
          <Switch
            checked={values.negativeMarking}
            onCheckedChange={(v) => set("negativeMarking", v)}
          />
        </div>

        {values.negativeMarking ? (
          <div className="space-y-1.5">
            <Label htmlFor="negMarks">Default negative marks per question</Label>
            <VoiceInput
              id="negMarks"
              type="number"
              step="0.05"
              value={values.defaultNegativeMarks}
              onChange={(e) => set("defaultNegativeMarks", Number(e.target.value))}
              className="h-10 w-32 rounded-lg"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="opensAt">Start date & time</Label>
            <VoiceInput
              id="opensAt"
              type="datetime-local"
              required
              value={values.opensAt}
              onChange={(e) => set("opensAt", e.target.value)}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closesAt">End date & time</Label>
            <VoiceInput
              id="closesAt"
              type="datetime-local"
              required
              value={values.closesAt}
              onChange={(e) => set("closesAt", e.target.value)}
              className="h-10 rounded-lg"
            />
          </div>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          Students can only start this test between the start and end. Once started, an attempt
          keeps running on its own duration timer even if the end time passes.
        </p>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Shuffle questions</p>
          <Switch
            checked={values.shuffleQuestions}
            onCheckedChange={(v) => set("shuffleQuestions", v)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Shuffle options</p>
          <Switch
            checked={values.shuffleOptions}
            onCheckedChange={(v) => set("shuffleOptions", v)}
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href={backHref}>Cancel</Link>}
        />
      </div>
    </form>
  );
}
