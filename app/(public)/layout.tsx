import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSession } from "@/src/lib/auth/session";
import { isAdminRole } from "@/src/lib/auth/permissions";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  return (
    <>
      <SiteHeader
        user={session ? { name: session.name, email: session.email } : null}
        homeHref={isAdminRole(session?.role) ? "/admin/dashboard" : "/overview"}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
