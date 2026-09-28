"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  LayoutGrid,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AccountMenu } from "@/components/layout/account-menu";

const NAV_LINKS = [
  { href: "/exams", label: "Exams" },
  { href: "/test-series", label: "Test Series" },
  { href: "/current-affairs", label: "Current Affairs" },
];

const ACCOUNT_MENU_ITEMS = [
  { href: "/overview", label: "Dashboard", icon: <LayoutGrid /> },
  { href: "/overview", label: "Notifications", icon: <Bell /> },
  { href: "/bookmarks", label: "Saved Items", icon: <Bookmark /> },
];

export function SiteHeader({
  user,
  homeHref = "/overview",
}: {
  user: { name: string; email: string } | null;
  /** Where a logged-in user's logo goes — their own area, not the public site. */
  homeHref?: string;
}) {
  const [open, setOpen] = useState(false);
  // Logged-in users work inside their own area, so the public browse links
  // (Exams / Test Series / Current Affairs) are hidden for them.
  const navLinks = user ? [] : NAV_LINKS;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-gradient-to-r from-accent/70 via-background to-background backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={user ? homeHref : "/"} className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              VR
            </span>
            <span className="text-base font-bold tracking-tight">
              VR TEST BATCH
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {user ? (
              <AccountMenu
                name={user.name}
                email={user.email}
                items={ACCOUNT_MENU_ITEMS}
                signOutRedirect="/login"
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Sign up
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-foreground/70 md:hidden"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      {/* Rendered outside <header>: its backdrop-blur would otherwise trap this fixed overlay inside the 64px bar. */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute top-0 right-0 flex h-full w-72 flex-col overflow-hidden border-l border-border bg-background p-5 shadow-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/70 via-background to-background" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">VR</span>
                <span className="text-base font-bold tracking-tight">VR TEST BATCH</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-foreground/70"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="relative mt-6 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent/60"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="relative mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {user ? (
                <>
                  <Link
                    href="/overview"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-foreground/80 hover:bg-accent/60"
                  >
                    {user.name}&apos;s Dashboard
                  </Link>
                  <LogoutButton className="justify-center rounded-lg px-3 py-2.5 hover:bg-accent/60" />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-foreground/80 hover:bg-accent/60"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
