"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/src/lib/api/list-params";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceButton } from "@/components/ui/voice-input";

const LANGUAGES = [
  { value: "en", label: "English", voice: "en-IN" },
  { value: "ta", label: "தமிழ்", voice: "ta-IN" },
] as const;

/** The English/Tamil picker (`?lang=`) drives voice search and which language the table lists and sorts names in. */
export function TableSearchBar({
  placeholder = "Search…",
  filters,
}: {
  placeholder?: string;
  /** Rendered between the language picker and the search input. */
  filters?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Re-sync the input when the URL's query changes (e.g. back/forward navigation).
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setValue(urlQuery);
  }

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(next)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: next || null }), 350);
  }

  const limit = searchParams.get("limit") ?? "10";
  const lang = searchParams.get("lang") === "ta" ? "ta" : "en";
  const voiceLang = LANGUAGES.find((l) => l.value === lang)?.voice;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={lang}
        onValueChange={(v) => updateParams({ lang: v === "en" ? null : v })}
      >
        <SelectTrigger className="h-9 w-28" aria-label="Language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {filters}
      <div className="relative flex-1 min-w-48">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {/* A spoken search replaces the query rather than appending to it. */}
        <VoiceButton lang={voiceLang} onResult={handleSearchChange} className="absolute top-1/2 right-1 -translate-y-1/2" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select
          value={limit}
          onValueChange={(v) => updateParams({ limit: v === "10" ? null : v })}
        >
          <SelectTrigger className="h-9 w-18">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
