import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermissionWithAccess } from "@/src/lib/auth/guard";
import { findBlockingReferences } from "@/src/lib/api/dependents";
import { invalidateAccountStatus } from "@/src/lib/auth/account-status";
import type { AdminAccess } from "@/src/lib/auth/permissions";
import { User } from "@/src/modules/users/user.model";
import { adminUserUpdateSchema } from "@/src/modules/users/admin-schemas";

type Context = { params: Promise<{ id: string }> };

const USER_FIELDS = "name email whatsapp role permissions emailVerified status createdAt";

/**
 * Admins with the "users" permission manage student accounts only; any other
 * account is reported as not found so staff accounts can't even be probed.
 */
async function findManageableUser(id: string, access: AdminAccess) {
  const user = await User.findById(id).select("role").lean();
  if (!user) return null;
  if (access.role !== "super_admin" && user.role !== "student") return null;
  return user;
}

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(_req: Request, { params }: Context) {
  const { access, error } = await requirePermissionWithAccess("users", "read");
  if (error) return error;

  const { id } = await params;
  await connectDB();

  if (!(await findManageableUser(id, access))) return notFound();
  const user = await User.findById(id).select(USER_FIELDS);
  if (!user) return notFound();
  return NextResponse.json({ item: user });
}

export async function PATCH(request: Request, { params }: Context) {
  const { access, error } = await requirePermissionWithAccess("users", "update");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const update = parsed.data;

  const isSuper = access.role === "super_admin";
  if (!isSuper && (update.role !== undefined && update.role !== "student")) {
    return NextResponse.json(
      { error: "Only a super admin can change roles" },
      { status: 403 },
    );
  }
  if (!isSuper && update.permissions !== undefined) {
    return NextResponse.json(
      { error: "Only a super admin can change permissions" },
      { status: 403 },
    );
  }

  if (access.userId === id && update.role !== undefined && update.role !== access.role) {
    return NextResponse.json(
      { error: "You can't change your own role" },
      { status: 400 },
    );
  }
  if (access.userId === id && update.status === "inactive") {
    return NextResponse.json(
      { error: "You can't disable your own account" },
      { status: 400 },
    );
  }

  await connectDB();

  const target = await findManageableUser(id, access);
  if (!target) return notFound();

  // Permissions only mean something for plain admins; clear them otherwise so
  // a later promotion back to admin doesn't silently restore old grants.
  const nextRole = update.role ?? target.role;
  if (nextRole !== "admin") update.permissions = {};

  const user = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).select(USER_FIELDS);

  if (!user) return notFound();
  invalidateAccountStatus(id);
  return NextResponse.json({ item: user });
}

export async function DELETE(_req: Request, { params }: Context) {
  const { access, error } = await requirePermissionWithAccess("users", "delete");
  if (error) return error;

  const { id } = await params;
  if (access.userId === id) {
    return NextResponse.json(
      { error: "You can't delete your own account" },
      { status: 400 },
    );
  }

  await connectDB();

  if (!(await findManageableUser(id, access))) return notFound();

  const blocked = await findBlockingReferences("User", id);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 409 });
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) return notFound();
  invalidateAccountStatus(id);
  return NextResponse.json({ message: "Deleted" });
}
