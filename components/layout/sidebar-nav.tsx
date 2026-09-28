"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Immediate click feedback while the link's route is still loading. */
function LinkPendingSpinner() {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin text-primary" />
  ) : null;
}

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** A count, or a promise of one so the shell can render before it resolves. */
  badge?: number | Promise<number>;
  /** Extra path prefixes that should also highlight this item (pages nested under it but routed elsewhere). */
  alsoActiveFor?: string[];
};

function NavBadge({ badge, active }: { badge: number | Promise<number>; active: boolean }) {
  const count = typeof badge === "number" ? badge : use(badge);
  if (!count) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        active ? "bg-primary/15 text-accent-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {count}
    </span>
  );
}

export function SidebarNav({
  title,
  items,
  open,
  onClose,
}: {
  title: string;
  items: SidebarNavItem[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background transition-transform duration-200 lg:relative lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Tint layer kept separate from the solid bg above so class-merging can never make the drawer see-through. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/70 via-background to-background"
        />
        <div className="relative flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">VR</span>
            <span className="text-base font-bold tracking-tight">VR TEST BATCH</span>
          </div>
          <p className="hidden text-xs font-semibold tracking-widest text-muted-foreground uppercase lg:block">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-muted-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="relative flex flex-col gap-0.5 p-2">
          {items.map((item) => {
            const active = [item.href, ...(item.alsoActiveFor ?? [])].some(
              (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground",
                  active &&
                    "bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-full before:bg-primary",
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <LinkPendingSpinner />
                {item.badge !== undefined ? (
                  <Suspense fallback={null}>
                    <NavBadge badge={item.badge} active={active} />
                  </Suspense>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
