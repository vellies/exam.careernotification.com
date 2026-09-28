"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput, VoiceTextarea } from "@/components/ui/voice-input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SimpleField =
  | { kind: "text"; name: string; label: string; required?: boolean; placeholder?: string }
  | { kind: "textarea"; name: string; label: string; placeholder?: string }
  | { kind: "number"; name: string; label: string }
  | { kind: "datetime"; name: string; label: string; hint?: string; required?: boolean }
  | {
      kind: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      placeholder?: string;
    };

type Values = Record<string, string | number>;

/** Selects with more options than this get a type-to-search dropdown. */
const SEARCHABLE_MIN_OPTIONS = 6;

/** Tamil fields follow the `*Ta` naming convention (nameTa, descriptionTa…), so dictate them in Tamil. */
const voiceLangFor = (name: string) => (name.endsWith("Ta") ? "ta-IN" : "en-IN");

export function SimpleEntityForm({
  resource,
  id,
  fields,
  initialValues,
  backHref,
  title,
  requireAnyOf,
}: {
  resource: string;
  id?: string;
  fields: SimpleField[];
  initialValues: Values;
  backHref: string;
  title: string;
  /** At least one of these fields must be filled (e.g. English or Tamil name). */
  requireAnyOf?: { fields: string[]; message: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField(name: string, value: string | number) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (requireAnyOf && !requireAnyOf.fields.some((f) => String(values[f] ?? "").trim())) {
      setError(requireAnyOf.message);
      document.getElementById(requireAnyOf.fields[0])?.focus();
      return;
    }
    setLoading(true);
    setError(null);

    const payload: Record<string, string | number | null> = { ...values };
    for (const field of fields) {
      if (field.kind !== "datetime") continue;
      const raw = values[field.name];
      payload[field.name] = raw ? new Date(raw).toISOString() : null;
    }

    const url = id ? `/api/admin/${resource}/${id}` : `/api/admin/${resource}`;
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

    router.push(backHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <div className="mt-6 space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name}>{field.label}</Label>

            {field.kind === "text" ? (
              <VoiceInput
                id={field.name}
                voiceLang={voiceLangFor(field.name)}
                value={values[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="h-10 rounded-lg"
              />
            ) : null}

            {field.kind === "number" ? (
              <VoiceInput
                id={field.name}
                type="number"
                value={values[field.name] ?? 0}
                onChange={(e) => setField(field.name, Number(e.target.value))}
                className="h-10 rounded-lg"
              />
            ) : null}

            {field.kind === "textarea" ? (
              <VoiceTextarea
                id={field.name}
                voiceLang={voiceLangFor(field.name)}
                value={values[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="rounded-lg"
              />
            ) : null}

            {field.kind === "datetime" ? (
              <>
                <VoiceInput
                  id={field.name}
                  type="datetime-local"
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  className="h-10 rounded-lg"
                />
                {field.hint ? (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                ) : null}
              </>
            ) : null}

            {/* Long reference lists (boards, exams…) get a searchable dropdown. */}
            {field.kind === "select" && field.options.length > SEARCHABLE_MIN_OPTIONS ? (
              <SearchableSelect
                id={field.name}
                options={field.options}
                value={(values[field.name] as string) || ""}
                onValueChange={(v) => setField(field.name, v)}
                placeholder={field.placeholder ?? "Search…"}
                clearable={false}
                className="h-10"
              />
            ) : null}

            {field.kind === "select" && field.options.length <= SEARCHABLE_MIN_OPTIONS ? (
              <Select
                items={field.options}
                value={(values[field.name] as string) || null}
                onValueChange={(v) => setField(field.name, v as string)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder={field.placeholder ?? "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
      ) : null}

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
