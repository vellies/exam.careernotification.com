export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type ListSearchParams = Record<string, string | string[] | undefined>;

/**
 * Shared page/limit/search parsing for the admin table pages. Every list page
 * reads pagination straight from the URL so it stays a plain server-rendered
 * link (no client state to keep in sync with what's actually in the DB).
 */
export function resolveListParams(searchParams: ListSearchParams) {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const rawLimit = Number(get("limit"));
  const limit = PAGE_SIZE_OPTIONS.includes(rawLimit as PageSize)
    ? (rawLimit as PageSize)
    : 10;

  const rawPage = Number(get("page"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const q = get("q")?.trim() ?? "";

  // Set by the language picker in TableSearchBar.
  const lang: ListLang = get("lang") === "ta" ? "ta" : "en";

  return { q, page, limit, skip: (page - 1) * limit, lang };
}

export type ListLang = "en" | "ta";

/**
 * Picks which of a bilingual pair to show first in a table cell. `secondary` is
 * the other language, or null when there's nothing different to show.
 */
export function localizedPair(lang: ListLang, en?: string | null, ta?: string | null) {
  const primary = lang === "ta" ? ta || en || "" : en || ta || "";
  const other = lang === "ta" ? en : ta;
  const secondary = en && ta && other && other !== primary ? other : null;
  return { primary, secondary };
}

/**
 * Aggregation expression for a sortable name: the Tamil field in Tamil mode
 * (falling back to the English one when it's empty), otherwise the English field.
 */
export function localizedSortField(lang: ListLang, field: string, taField: string) {
  if (lang !== "ta") return `$${field}`;
  return { $cond: [{ $gt: [{ $ifNull: [`$${taField}`, ""] }, ""] }, `$${taField}`, `$${field}`] };
}
