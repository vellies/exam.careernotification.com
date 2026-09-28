import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  published: "bg-primary text-primary-foreground",
  paid: "bg-primary text-primary-foreground",
  draft: "bg-muted text-foreground",
  inactive: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        STYLES[status] ?? "bg-muted text-foreground",
      )}
    >
      {status}
    </span>
  );
}
