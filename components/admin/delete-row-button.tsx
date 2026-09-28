"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteRowButton({
  resource,
  id,
  url,
  title = "Delete this record?",
  confirmLabel = "This can't be undone.",
  actionLabel = "Delete",
}: {
  resource?: string;
  id?: string;
  /** Overrides the default `/api/admin/{resource}/{id}` endpoint. */
  url?: string;
  title?: string;
  confirmLabel?: string;
  actionLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(url ?? `/api/admin/${resource}/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Failed to delete");
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger
        aria-label={actionLabel}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{confirmLabel}</AlertDialogDescription>
        {error ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>
            {error ? "Close" : "Cancel"}
          </Button>
          {error ? null : (
            <Button type="button" variant="destructive" disabled={loading} onClick={handleDelete}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : actionLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
