"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/admin/status-badge";
import { useBulkSelection } from "@/components/admin/bulk-selection";

const STATUSES = ["draft", "published", "archived"] as const;
type Status = (typeof STATUSES)[number];

/** The confirmed action plus a snapshot of the IDs it applies to. */
type Pending = ({ action: "status"; status: Status } | { action: "delete" }) & { ids: string[] };

const plural = (n: number) => `${n} question${n === 1 ? "" : "s"}`;

/** Bulk bar for the Question Bank: change status or delete the selected rows, each behind a confirm dialog. */
export function QuestionBulkActions({
  canUpdate = true,
  canDelete = true,
}: {
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const { selected, clear } = useBulkSelection();
  // Kept after closing so the dialog text doesn't blank out during its exit animation.
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const count = selected.length;

  async function confirm() {
    if (!pending || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/questions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    if (pending.action === "status") {
      setNotice(`${plural(data.matched ?? pending.ids.length)} set to ${pending.status}.`);
    } else {
      const skipped = data.skipped
        ? ` ${plural(data.skipped)} skipped — used in tests or attempts.`
        : "";
      setNotice(`${plural(data.deleted ?? 0)} deleted.${skipped}`);
    }
    setOpen(false);
    clear();
    router.refresh();
  }

  return (
    <>
      {count > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{count} selected</span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            {canUpdate ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                  Change status <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  {STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => {
                        setNotice(null);
                        setPending({ action: "status", status, ids: selected });
                        setError(null);
                        setOpen(true);
                      }}
                    >
                      <StatusBadge status={status} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {canDelete ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setNotice(null);
                  setPending({ action: "delete", ids: selected });
                  setError(null);
                  setOpen(true);
                }}
              >
                <Trash2 /> Delete
              </Button>
            ) : null}
          </div>
        </div>
      ) : notice ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !loading) setOpen(false);
        }}
      >
        <AlertDialogContent>
          {pending?.action === "delete" ? (
            <>
              <AlertDialogTitle>Delete {plural(pending.ids.length)}?</AlertDialogTitle>
              <AlertDialogDescription>
                This can&apos;t be undone. Questions used in a test or attempt are skipped.
              </AlertDialogDescription>
            </>
          ) : pending ? (
            <>
              <AlertDialogTitle>Change status of {plural(pending.ids.length)}?</AlertDialogTitle>
              <AlertDialogDescription>
                The selected questions will be set to <StatusBadge status={pending.status} />.
              </AlertDialogDescription>
            </>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={pending?.action === "delete" ? "destructive" : "default"}
              disabled={loading}
              onClick={confirm}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : pending?.action === "delete" ? (
                "Delete"
              ) : (
                "Change status"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
