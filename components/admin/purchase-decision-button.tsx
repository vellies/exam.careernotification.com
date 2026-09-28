"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PurchaseDecisionButton({
  id,
  decision,
  studentName,
  seriesTitle,
}: {
  id: string;
  decision: "paid" | "rejected";
  studentName: string;
  seriesTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isApprove = decision === "paid";

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    setOpen(false);
    router.refresh();
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
        className={
          isApprove
            ? "inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            : "inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        }
      >
        {isApprove ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        {isApprove ? "Approve" : "Reject"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>
          {isApprove ? "Approve purchase request?" : "Reject purchase request?"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {isApprove
            ? `This grants ${studentName} access to "${seriesTitle}" — they'll be able to start every test in this series right away.`
            : `${studentName}'s request for "${seriesTitle}" will be declined. They can submit a new request later.`}
        </AlertDialogDescription>
        {error ? (
          <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
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
            variant={isApprove ? "default" : "destructive"}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isApprove ? (
              "Approve"
            ) : (
              "Reject"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
