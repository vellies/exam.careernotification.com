"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type BulkSelectionValue = {
  /** IDs of the rows on the current page. */
  pageIds: string[];
  selected: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  setPageIds: (ids: string[]) => void;
};

const BulkSelectionContext = createContext<BulkSelectionValue | null>(null);

export function useBulkSelection() {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) throw new Error("useBulkSelection must be used inside <BulkSelectionProvider>");
  return ctx;
}

/**
 * Row selection for an admin table page. Wrap the whole table shell so the
 * toolbar (bulk actions) and the rows (checkboxes) share the selection.
 * Selection is per page: rows that leave the page drop out of it.
 *
 * The rows usually stream in after the toolbar, so the page's IDs are
 * registered by <BulkSelectionPageIds> rendered alongside them.
 */
export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [pageIds, setPageIds] = useState<string[]>([]);

  // Only IDs still on the page count, so paging/filtering can't act on hidden rows.
  const selected = useMemo(() => pageIds.filter((id) => picked.has(id)), [pageIds, picked]);

  const toggle = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = pageIds.length > 0 && selected.length === pageIds.length;
  const toggleAll = useCallback(() => {
    setPicked(allSelected ? new Set() : new Set(pageIds));
  }, [allSelected, pageIds]);

  const clear = useCallback(() => setPicked(new Set()), []);

  const value = useMemo(
    () => ({
      pageIds,
      selected,
      isSelected: (id: string) => selected.includes(id),
      toggle,
      toggleAll,
      clear,
      setPageIds,
    }),
    [pageIds, selected, toggle, toggleAll, clear],
  );

  return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

/** Tells the provider which row IDs are on the current page. Renders nothing. */
export function BulkSelectionPageIds({ ids }: { ids: string[] }) {
  const { setPageIds } = useBulkSelection();
  const key = ids.join(",");
  useEffect(() => {
    setPageIds(key ? key.split(",") : []);
    return () => setPageIds([]);
  }, [key, setPageIds]);
  return null;
}

const checkboxClass = "size-4 cursor-pointer rounded accent-primary align-middle";

/** Header checkbox: selects or clears every row on the page. */
export function BulkSelectAllCheckbox() {
  const { pageIds, selected, toggleAll } = useBulkSelection();
  const all = pageIds.length > 0 && selected.length === pageIds.length;
  const some = selected.length > 0 && !all;

  return (
    <input
      type="checkbox"
      className={checkboxClass}
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = some;
      }}
      disabled={pageIds.length === 0}
      onChange={toggleAll}
      aria-label={all ? "Clear selection" : "Select all on this page"}
    />
  );
}

/** Per-row checkbox. */
export function BulkSelectCheckbox({ id, label }: { id: string; label?: string }) {
  const { isSelected, toggle } = useBulkSelection();
  return (
    <input
      type="checkbox"
      className={checkboxClass}
      checked={isSelected(id)}
      onChange={() => toggle(id)}
      aria-label={label ?? "Select row"}
    />
  );
}
