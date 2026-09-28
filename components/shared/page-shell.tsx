import type { ReactNode } from "react";
import { Construction } from "lucide-react";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-10">{children}</div> : null}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex min-h-55 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Construction className="size-5" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">
        This section is on the build roadmap.
      </p>
    </div>
  );
}
