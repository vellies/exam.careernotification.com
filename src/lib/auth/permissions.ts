// Shared by server code and client components, so keep this free of
// server-only imports.

export const ROLES = ["super_admin", "admin", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = ["create", "read", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Areas of the admin panel a super admin can grant to an admin, and which of
 * the CRUD actions each one actually has (e.g. purchases can only be
 * reviewed, reports only viewed).
 */
export const RESOURCES = {
  exams: { label: "Exams & Categories", actions: ["create", "read", "update", "delete"] },
  syllabus: { label: "Subjects & Topics", actions: ["create", "read", "update", "delete"] },
  questions: { label: "Question Bank & OCR", actions: ["create", "read", "update", "delete"] },
  testSeries: { label: "Test Series", actions: ["create", "read", "update", "delete"] },
  tests: { label: "Tests", actions: ["create", "read", "update", "delete"] },
  purchases: { label: "Purchase Requests", actions: ["read", "update"] },
  users: { label: "Users (students only)", actions: ["create", "read", "update", "delete"] },
  reports: { label: "Reports", actions: ["read"] },
} as const satisfies Record<string, { label: string; actions: readonly Action[] }>;

export type Resource = keyof typeof RESOURCES;
export const RESOURCE_KEYS = Object.keys(RESOURCES) as Resource[];

export type Permissions = Partial<Record<Resource, Partial<Record<Action, boolean>>>>;

export type AdminAccess = { role: Role; permissions: Permissions };

export const isAdminRole = (role: string | undefined): role is "admin" | "super_admin" =>
  role === "admin" || role === "super_admin";

/** Super admins can do everything; admins only what they've been granted. */
export function can(access: AdminAccess | null | undefined, resource: Resource, action: Action) {
  if (!access) return false;
  if (access.role === "super_admin") return true;
  if (access.role !== "admin") return false;
  return access.permissions?.[resource]?.[action] === true;
}

/** Drops unknown resources/actions so only the defined matrix is ever stored. */
export function sanitizePermissions(input: unknown): Permissions {
  const out: Permissions = {};
  if (!input || typeof input !== "object") return out;
  for (const resource of RESOURCE_KEYS) {
    const given = (input as Record<string, unknown>)[resource];
    if (!given || typeof given !== "object") continue;
    const allowed: Partial<Record<Action, boolean>> = {};
    for (const action of RESOURCES[resource].actions) {
      if ((given as Record<string, unknown>)[action] === true) allowed[action] = true;
    }
    if (Object.keys(allowed).length) out[resource] = allowed;
  }
  return out;
}
