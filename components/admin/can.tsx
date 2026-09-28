import type { ReactNode } from "react";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { can, type Action, type Resource } from "@/src/lib/auth/permissions";

/**
 * Renders its children only when the signed-in admin may `action` the
 * `resource`. Purely cosmetic — the API routes enforce the same check.
 */
export async function Can({
  resource,
  action,
  children,
  fallback = null,
}: {
  resource: Resource;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const access = await getAdminAccess();
  return can(access, resource, action) ? children : fallback;
}
