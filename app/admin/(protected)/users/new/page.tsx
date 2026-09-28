import { UserForm } from "@/components/admin/user-form";
import { getAdminAccess } from "@/src/lib/auth/guard";

export default async function NewUserPage() {
  const access = await getAdminAccess();

  return (
    <UserForm
      isSuperAdmin={access?.role === "super_admin"}
      initial={{
        name: "",
        email: "",
        whatsapp: "",
        password: "",
        role: "student",
        permissions: {},
        emailVerified: true,
        status: "active",
      }}
    />
  );
}
