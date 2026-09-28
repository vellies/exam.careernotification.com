import { cache } from "react";
import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/src/lib/auth/session";
import { getAccountState, DISABLED_ACCOUNT_MESSAGE } from "@/src/lib/auth/account-status";
import {
  can,
  isAdminRole,
  RESOURCES,
  type Action,
  type AdminAccess,
  type Resource,
} from "@/src/lib/auth/permissions";

async function disabledResponse() {
  await clearSessionCookie();
  return NextResponse.json(
    { error: DISABLED_ACCOUNT_MESSAGE, code: "disabled" },
    { status: 403 },
  );
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Resolves the caller's live role and permissions (not the JWT's, which may be
 * stale) or returns the error response to send back.
 */
async function resolveAdmin(): Promise<
  { access: AdminAccess & { userId: string }; error: null } | { access: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session) return { access: null, error: unauthorized() };
  const state = await getAccountState(session.sub);
  if (!state || !isAdminRole(state.role)) return { access: null, error: unauthorized() };
  if (!state.active) return { access: null, error: await disabledResponse() };
  return {
    access: { userId: session.sub, role: state.role, permissions: state.permissions },
    error: null,
  };
}

/**
 * For server components: the signed-in, active admin's live access, or null.
 * Unlike the route guards it never touches cookies (server components can't).
 */
// Wrapped in React's per-request cache: a list page renders a <Can> per row,
// and they should share one lookup rather than query the DB each.
export const getAdminAccess = cache(
  async (): Promise<(AdminAccess & { userId: string }) | null> => {
    const session = await getSession();
    if (!session) return null;
    const state = await getAccountState(session.sub);
    if (!state?.active || !isAdminRole(state.role)) return null;
    return { userId: session.sub, role: state.role, permissions: state.permissions };
  },
);

/** Any admin or super admin, regardless of granted permissions. */
export async function requireAdmin() {
  return (await resolveAdmin()).error;
}

export async function requireSuperAdmin() {
  const { access, error } = await resolveAdmin();
  if (error) return error;
  if (access.role !== "super_admin") {
    return NextResponse.json({ error: "Only a super admin can do this" }, { status: 403 });
  }
  return null;
}

/**
 * An admin granted `action` on `resource`, or a super admin. Also hands back
 * the caller's access for routes that need finer checks.
 */
export async function requirePermissionWithAccess(resource: Resource, action: Action) {
  const result = await resolveAdmin();
  if (result.error) return result;
  if (!can(result.access, resource, action)) {
    return {
      access: null,
      error: NextResponse.json(
        { error: `You don't have permission to ${action} ${RESOURCES[resource].label.toLowerCase()}` },
        { status: 403 },
      ),
    };
  }
  return result;
}

export async function requirePermission(resource: Resource, action: Action) {
  return (await requirePermissionWithAccess(resource, action)).error;
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return unauthorized();
  const state = await getAccountState(session.sub);
  if (!state) return unauthorized();
  if (!state.active) return disabledResponse();
  return null;
}
