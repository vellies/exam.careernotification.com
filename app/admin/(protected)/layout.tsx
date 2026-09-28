import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BookMarked,
  Library,
  ClipboardList,
  Users,
  BarChart3,
  Wallet,
  ScanText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { AccountMenuItem } from "@/components/layout/account-menu";
import { getSession } from "@/src/lib/auth/session";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can, type Action, type AdminAccess, type Resource } from "@/src/lib/auth/permissions";
import { connectDB } from "@/src/lib/mongodb";
import { Purchase } from "@/src/modules/payments/purchase.model";

const ICON_CLASS = "size-4 shrink-0";

async function countPendingPurchases() {
  await connectDB();
  return Purchase.countDocuments({ status: "pending" });
}

type GatedNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  alsoActiveFor?: string[];
  badge?: Promise<number>;
  /** Hidden unless the admin may `action` (default "read") this resource. */
  resource?: Resource;
  action?: Action;
};

function buildAdminNav(access: AdminAccess) {
  // Not awaited: the sidebar shows the badge once the count arrives.
  const pendingPurchases = can(access, "purchases", "read") ? countPendingPurchases() : undefined;

  const items: GatedNavItem[] = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "exams",
      href: "/admin/exams",
      label: "Exams",
      icon: <GraduationCap className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "syllabus",
      href: "/admin/syllabus",
      label: "Syllabus",
      icon: <BookMarked className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "questions",
      href: "/admin/questions",
      label: "Question Bank",
      icon: <Library className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "questions",
      action: "create",
      href: "/admin/ocr",
      label: "OCR Extract",
      icon: <ScanText className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "testSeries",
      href: "/admin/test-series",
      label: "Test Series",
      icon: <ClipboardList className={ICON_CLASS} strokeWidth={1.75} />,
      alsoActiveFor: ["/admin/tests"],
    },
    {
      resource: "purchases",
      href: "/admin/purchases",
      label: "Purchase Requests",
      icon: <Wallet className={ICON_CLASS} strokeWidth={1.75} />,
      badge: pendingPurchases,
    },
    {
      resource: "users",
      href: "/admin/users",
      label: "Users",
      icon: <Users className={ICON_CLASS} strokeWidth={1.75} />,
    },
    {
      resource: "reports",
      href: "/admin/reports",
      label: "Reports",
      icon: <BarChart3 className={ICON_CLASS} strokeWidth={1.75} />,
    },
  ];

  // An admin granted tests but not test series still needs a way in.
  if (!can(access, "testSeries", "read") && can(access, "tests", "read")) {
    const series = items.find((item) => item.href === "/admin/test-series");
    if (series) Object.assign(series, { href: "/admin/tests", label: "Tests", resource: "tests" });
  }

  return items
    .filter((item) => !item.resource || can(access, item.resource, item.action ?? "read"))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ resource, action, ...item }) => item);
}

function buildAccountMenu(access: AdminAccess): AccountMenuItem[] {
  return [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} strokeWidth={1.75} /> },
    ...(can(access, "users", "read")
      ? [{ href: "/admin/users", label: "Users", icon: <Users className={ICON_CLASS} strokeWidth={1.75} /> }]
      : []),
    ...(can(access, "reports", "read")
      ? [{ href: "/admin/reports", label: "Reports", icon: <BarChart3 className={ICON_CLASS} strokeWidth={1.75} /> }]
      : []),
  ];
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, access] = await Promise.all([getSession(), getAdminAccess()]);

  if (!session || !access) {
    redirect("/login");
  }

  const adminNav = buildAdminNav(access);

  return (
    <AppShell
      navTitle={access.role === "super_admin" ? "Super Admin" : "Admin"}
      navItems={adminNav}
      user={{ name: session.name, email: session.email }}
      accountMenuItems={buildAccountMenu(access)}
      logoutRedirect="/login"
      adminTheme
      homeHref="/admin/dashboard"
    >
      {children}
    </AppShell>
  );
}
