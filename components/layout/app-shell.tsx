"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SidebarNav, type SidebarNavItem } from "@/components/layout/sidebar-nav";
import { AccountMenu, type AccountMenuItem } from "@/components/layout/account-menu";
import { ThemeContainerProvider } from "@/components/layout/theme-container";
import { cn } from "@/lib/utils";

export function AppShell({
  navTitle,
  navItems,
  user,
  accountMenuItems,
  logoutRedirect,
  adminTheme,
  homeHref = "/overview",
  children,
}: {
  navTitle: string;
  navItems: SidebarNavItem[];
  user: { name: string; email: string };
  accountMenuItems: AccountMenuItem[];
  logoutRedirect: string;
  adminTheme?: boolean;
  homeHref?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ThemeContainerProvider
      className={cn(adminTheme && "theme-admin", "flex min-h-screen flex-col bg-background text-foreground")}
    >
      <header className="border-b border-border bg-gradient-to-r from-accent/70 via-background to-background">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="text-foreground/70 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <Link href={homeHref} className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                VR
              </span>
              <span className="hidden text-base font-bold tracking-tight sm:inline">
                VR TEST BATCH
              </span>
            </Link>
          </div>


          <AccountMenu
            name={user.name}
            email={user.email}
            items={accountMenuItems}
            signOutRedirect={logoutRedirect}
          />
        </div>
      </header>
      <div className="flex flex-1">
        <SidebarNav
          title={navTitle}
          items={navItems}
          open={open}
          onClose={() => setOpen(false)}
        />
        <main className="w-full min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          {children}
        </main>
      </div>
    </ThemeContainerProvider>
  );
}
