"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput, VoiceTextarea } from "@/components/ui/voice-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAYMENT_MODES = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export function PurchaseButton({
  testSeriesId,
  price,
  seriesTitle,
  rejected,
  onRequested,
}: {
  testSeriesId: string;
  price: number;
  seriesTitle?: string;
  rejected?: boolean;
  onRequested?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [paymentReference, setPaymentReference] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/payments/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testSeriesId,
        phone,
        paymentMode,
        paymentReference,
        description,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    setOpen(false);
    if (onRequested) {
      onRequested();
    } else {
      router.refresh();
    }
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
        render={
          <Button size="sm">
            <Lock className="size-3.5" /> {rejected ? "Request again" : `Request access · ₹${price}`}
          </Button>
        }
      />
      <AlertDialogContent className="max-w-md">
        <AlertDialogTitle>Request access to this test series?</AlertDialogTitle>
        <AlertDialogDescription>
          {`Pay ₹${price} for ${seriesTitle ? `"${seriesTitle}"` : "this test series"} using the payment details shared with you, then submit the details below so an admin can verify and approve your access.`}
        </AlertDialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="purchase-phone">Phone number</Label>
            <VoiceInput
              id="purchase-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              className="h-10 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as string)}>
              <SelectTrigger className="h-10 w-full rounded-lg">
                <SelectValue>
                  {(value: string) =>
                    PAYMENT_MODES.find((mode) => mode.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-reference">Payment reference / UTR number</Label>
            <VoiceInput
              id="purchase-reference"
              required
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. 402913456789"
              className="h-10 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-description">Description (optional)</Label>
            <VoiceTextarea
              id="purchase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything else the admin should know"
              className="rounded-lg"
              rows={2}
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
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
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Send request"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
