import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminTabs({
  tabs,
  active,
}: {
  tabs: { href: string; label: string }[];
  active: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            tab.href === active
              ? "border-primary text-foreground"
              : "border-transparent",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
