import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/admin/can";
import type { Action, Resource } from "@/src/lib/auth/permissions";

function MaybeCan({
  resource,
  action,
  children,
}: {
  resource?: Resource;
  action: Action;
  children: ReactNode;
}) {
  return resource ? (
    <Can resource={resource} action={action}>
      {children}
    </Can>
  ) : (
    children
  );
}

export function AdminTableShell({
  title,
  description,
  newHref,
  newLabel,
  resource,
  actions,
  toolbar,
  pagination,
  children,
}: {
  title: string;
  description?: ReactNode;
  newHref?: string;
  newLabel?: string;
  /** When set, the "new" button only shows to admins who may create this resource. */
  resource?: Resource;
  /** Extra header buttons shown before the "new" button. */
  actions?: ReactNode;
  toolbar?: ReactNode;
  pagination?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions || newHref ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {newHref ? (
              <MaybeCan resource={resource} action="create">
                <Button
                  nativeButton={false}
                  render={
                    <Link href={newHref}>
                      <Plus className="size-4" />
                      {newLabel ?? "New"}
                    </Link>
                  }
                />
              </MaybeCan>
            ) : null}
          </div>
        ) : null}
      </div>
      {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      <div className="mt-6 overflow-hidden rounded-md border border-border">
        {children}
        {pagination}
      </div>
    </div>
  );
}

export function AdminTable({
  columns,
  startIndex = 0,
  selectHeader,
  children,
}: {
  columns: string[];
  /** Number of rows before this page, so serial numbers continue across pages. */
  startIndex?: number;
  /**
   * Header cell for a leading checkbox column (e.g. <BulkSelectAllCheckbox />).
   * When set, each row's first <td> is its checkbox cell and stays ahead of "#".
   */
  selectHeader?: ReactNode;
  children: ReactNode;
}) {
  // Prepend a serial-number cell to every data row; widen the empty-state row to match.
  const rows = Children.toArray(children).map((child, i) => {
    if (!isValidElement(child)) return child;
    const row = child as ReactElement<{ children?: ReactNode; colSpan?: number }>;
    if (row.type === AdminEmptyRow || row.type === AdminLoadingRow) {
      return cloneElement(row, { colSpan: (row.props.colSpan ?? columns.length) + 1 });
    }
    const sno = (
      <td key="sno" className="w-12 px-4 py-3 text-muted-foreground tabular-nums">
        {startIndex + i + 1}
      </td>
    );
    if (selectHeader) {
      const [checkboxCell, ...cells] = Children.toArray(row.props.children);
      return cloneElement(row, undefined, checkboxCell, sno, ...cells);
    }
    return cloneElement(row, undefined, sno, row.props.children);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/60 text-left">
            {selectHeader ? <th className="w-10 py-2.5 pr-0 pl-4">{selectHeader}</th> : null}
            <th className="w-12 px-4 py-2.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {col}
              </th>
            ))}
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{rows}</tbody>
      </table>
    </div>
  );
}

export function AdminEmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

/** Full-width body row holding the loader while a table's rows stream in. */
export function AdminLoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-20">
        <div role="status" aria-live="polite" className="flex items-center justify-center">
          <div className="loader" />
          <span className="sr-only">Loading…</span>
        </div>
      </td>
    </tr>
  );
}

/** `<Suspense>` fallback for a list page: the real table header with the loader in its body. */
export function AdminTableLoading({
  columns,
  selectHeader,
}: {
  columns: string[];
  selectHeader?: ReactNode;
}) {
  return (
    <AdminTable columns={columns} selectHeader={selectHeader}>
      <AdminLoadingRow colSpan={columns.length + 1 + (selectHeader ? 1 : 0)} />
    </AdminTable>
  );
}
