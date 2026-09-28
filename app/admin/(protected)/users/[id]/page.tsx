import { notFound } from "next/navigation";
import { UserForm } from "@/components/admin/user-form";
import { connectDB } from "@/src/lib/mongodb";
import { getAdminAccess } from "@/src/lib/auth/guard";
import { sanitizePermissions } from "@/src/lib/auth/permissions";
import { User } from "@/src/modules/users/user.model";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [, access] = await Promise.all([connectDB(), getAdminAccess()]);
  const user = await User.findById(id).lean();
  if (!user) notFound();
  // Admins manage students only; staff accounts are the super admin's business.
  const isSuperAdmin = access?.role === "super_admin";
  if (!isSuperAdmin && user.role !== "student") notFound();

  return (
    <UserForm
      id={id}
      isSuperAdmin={isSuperAdmin}
      isSelf={access?.userId === id}
      initial={{
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp ?? "",
        password: "",
        role: user.role,
        permissions: sanitizePermissions(user.permissions),
        emailVerified: user.emailVerified,
        status: user.status ?? "active",
      }}
    />
  );
}
