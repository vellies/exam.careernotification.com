"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountMenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function AccountMenu({
  name,
  email,
  items,
  signOutRedirect,
  triggerClassName,
}: {
  name: string;
  email: string;
  items: AccountMenuItem[];
  signOutRedirect: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [redirecting, startRedirect] = useTransition();

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    startRedirect(() => {
      router.push(signOutRedirect);
      router.refresh();
    });
    setSigningOut(false);
  }

  return (
    <>
      {signingOut || redirecting ? (
        <div
          role="status"
          className="fixed inset-0 z-[100] flex items-center justify-center gap-2 bg-background/70 text-sm font-medium backdrop-blur-sm"
        >
          <Loader2 className="size-4 animate-spin text-primary" />
          Signing out…
        </div>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open account menu"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            triggerClassName,
          )}
        >
          {name.charAt(0).toUpperCase()}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="px-4 py-3.5">
            <p className="text-sm font-bold text-foreground">{name}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
