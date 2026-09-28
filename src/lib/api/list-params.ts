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

  return { q, page, limit, skip: (page - 1) * limit };
}
