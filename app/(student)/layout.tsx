import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardCheck,
  Trophy,
  Bookmark,
  UserRound,
  Bell,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { AccountMenuItem } from "@/components/layout/account-menu";
import { getSession } from "@/src/lib/auth/session";
import { isAdminRole } from "@/src/lib/auth/permissions";

const ICON_CLASS = "size-4 shrink-0";

const DASHBOARD_NAV = [
  {
    href: "/overview",
    label: "Overview",
    icon: <LayoutDashboard className={ICON_CLASS} strokeWidth={1.75} />,
  },
  {
    href: "/series",
    label: "Tests",
    icon: <ListChecks className={ICON_CLASS} strokeWidth={1.75} />,
  },
  {
    href: "/my-tests",
    label: "My Tests",
    icon: <ClipboardCheck className={ICON_CLASS} strokeWidth={1.75} />,
  },
  {
    href: "/my-results",
    label: "Results",
    icon: <Trophy className={ICON_CLASS} strokeWidth={1.75} />,
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: <Bookmark className={ICON_CLASS} strokeWidth={1.75} />,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: <UserRound className={ICON_CLASS} strokeWidth={1.75} />,
  },
];

const ACCOUNT_MENU_ITEMS: AccountMenuItem[] = [
  { href: "/overview", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} strokeWidth={1.75} /> },
  { href: "/overview", label: "Notifications", icon: <Bell className={ICON_CLASS} strokeWidth={1.75} /> },
  { href: "/bookmarks", label: "Saved Items", icon: <Bookmark className={ICON_CLASS} strokeWidth={1.75} /> },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }
  if (isAdminRole(session.role)) {
    redirect("/admin/dashboard");
  }

  return (
    <AppShell
      navTitle="Dashboard"
      navItems={DASHBOARD_NAV}
      user={{ name: session.name, email: session.email }}
      accountMenuItems={ACCOUNT_MENU_ITEMS}
      logoutRedirect="/login"
    >
      {children}
    </AppShell>
  );
}
