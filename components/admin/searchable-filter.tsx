"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";

export type FilterOption = SearchableOption;

/**
 * Searchable dropdown that syncs a single URL search param (e.g. `?subject=`),
 * so the server-rendered list page re-queries on change.
 */
export function SearchableFilter({
  param,
  options,
  placeholder = "All",
}: {
  param: string;
  options: FilterOption[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(param, next);
    else params.delete(param);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-64">
      <SearchableSelect
        options={options}
        value={searchParams.get(param) ?? ""}
        onValueChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
