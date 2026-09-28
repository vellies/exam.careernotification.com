import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListSearchParams } from "@/src/lib/api/list-params";

export function AdminPagination({
  page,
  limit,
  total,
  searchParams,
}: {
  page: number;
  limit: number;
  total: number;
  searchParams: ListSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  function hrefForPage(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      const v = Array.isArray(value) ? value[0] : value;
      if (v) params.set(key, v);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <p>
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <PageLink
          href={hrefForPage(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="px-2 text-foreground">
          Page {page} of {totalPages}
        </span>
        <PageLink
          href={hrefForPage(page + 1)}
          disabled={page >= totalPages}
          label="Next page"
        >
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        aria-disabled
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
