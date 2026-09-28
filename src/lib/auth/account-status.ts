import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { sanitizePermissions, type AdminAccess, type Role } from "@/src/lib/auth/permissions";

// The proxy runs this on every navigation and link prefetch, so a DB round-trip
// each time made page changes feel sluggish. Results are cached briefly per
// user; admin edits call `invalidateAccountStatus` so a disable still applies
// on the user's next request. Kept on globalThis so the proxy and route
// handlers share one cache and it survives hot reloads.
const CACHE_TTL_MS = 60_000;

type AccountState = AdminAccess & { active: boolean };

const globalForStatus = globalThis as unknown as {
  accountStateCache?: Map<string, { state: AccountState | null; expiresAt: number }>;
};
const cache = (globalForStatus.accountStateCache ??= new Map());

/**
 * Sessions are stateless JWTs, so a role, permission or status change in the
 * admin panel doesn't touch a cookie the user already holds — this is the
 * live lookup that makes such changes apply on their very next request.
 * Returns null when the user no longer exists.
 */
export async function getAccountState(userId: string): Promise<AccountState | null> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.state;

  await connectDB();
  const user = await User.findById(userId).select("status role permissions").lean();
  const state: AccountState | null = user
    ? {
        active: (user.status ?? "active") === "active",
        role: user.role as Role,
        permissions: sanitizePermissions(user.permissions),
      }
    : null;
  // Only students are cached. Staff are few, and their permissions must take
  // effect immediately — invalidation alone isn't reliable because the proxy
  // and route handlers can run with separate copies of this cache.
  if (state?.role === "student") {
    cache.set(userId, { state, expiresAt: Date.now() + CACHE_TTL_MS });
  } else {
    cache.delete(userId);
  }
  return state;
}

export async function isAccountActive(userId: string): Promise<boolean> {
  return (await getAccountState(userId))?.active ?? false;
}

export function invalidateAccountStatus(userId: string) {
  cache.delete(userId);
}

export const DISABLED_ACCOUNT_MESSAGE =
  "Your account has been disabled. Contact support for help.";
