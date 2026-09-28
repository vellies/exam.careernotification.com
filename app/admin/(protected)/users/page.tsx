import { Suspense } from "react";
import Link from "next/link";
import { Pencil, BadgeCheck, CircleDashed } from "lucide-react";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { UserPreviewButton } from "@/components/admin/user-preview-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { connectDB } from "@/src/lib/mongodb";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { sanitizePermissions } from "@/src/lib/auth/permissions";
import { formatDateTime } from "@/src/lib/datetime";
import { resolveListParams, type ListSearchParams } from "@/src/lib/api/list-params";
import { User } from "@/src/modules/users/user.model";

const COLUMNS = ["Name", "Email", "WhatsApp", "Role", "Verified", "Status"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AdminTableShell
      title="Users"
      newHref="/admin/users/new"
      resource="users"
      newLabel="New User"
      toolbar={<TableSearchBar placeholder="Search users…" />}
    >
      <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
        <UsersTable searchParams={resolvedSearchParams} />
      </Suspense>
    </AdminTableShell>
  );
}

async function UsersTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip } = resolveListParams(searchParams);
  const [, access] = await Promise.all([connectDB(), getAdminAccess()]);

  const filter: Record<string, unknown> = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { whatsapp: { $regex: q.replace(/[^\d+]/g, "") || q, $options: "i" } },
        ],
      }
    : {};
  // Admins manage students only; staff accounts are the super admin's business.
  if (access?.role !== "super_admin") filter.role = "student";

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email whatsapp role permissions emailVerified status createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {users.length === 0 ? (
          <AdminEmptyRow colSpan={8} label="No users yet." />
        ) : (
          users.map((user) => (
            <tr key={String(user._id)}>
              <td className="px-4 py-3 font-medium">{user.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.whatsapp ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{user.role.replace("_", " ")}</td>
              <td className="px-4 py-3">
                {user.emailVerified ? (
                  <BadgeCheck className="size-4 text-emerald-600" />
                ) : (
                  <CircleDashed className="size-4 text-muted-foreground" />
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={user.status ?? "active"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <UserPreviewButton
                    user={{
                      name: user.name,
                      email: user.email,
                      whatsapp: user.whatsapp ?? undefined,
                      role: user.role,
                      emailVerified: user.emailVerified,
                      status: user.status ?? "active",
                      joined: formatDateTime(user.createdAt),
                      // Only a super admin sees (and manages) staff permissions.
                      permissions:
                        access?.role === "super_admin" && user.role === "admin"
                          ? sanitizePermissions(user.permissions)
                          : undefined,
                    }}
                  />
                  <Can resource="users" action="update">
                    <Link
                      href={`/admin/users/${user._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="users" action="delete">
                    <DeleteRowButton resource="users" id={String(user._id)} />
                  </Can>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
      <AdminPagination page={page} limit={limit} total={total} searchParams={searchParams} />
    </>
  );
}
