import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermissionWithAccess } from "@/src/lib/auth/guard";
import { ROLES } from "@/src/lib/auth/permissions";
import { User } from "@/src/modules/users/user.model";
import { adminUserCreateSchema } from "@/src/modules/users/admin-schemas";
import { hashPassword } from "@/src/lib/auth/password";

export async function GET(request: Request) {
  const { access, error } = await requirePermissionWithAccess("users", "read");
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role");
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }
  if (ROLES.includes(role as (typeof ROLES)[number])) {
    filter.role = role;
  }
  // Admins manage students only; staff accounts are the super admin's business.
  if (access.role !== "super_admin") {
    filter.role = "student";
  }
  if (status === "active" || status === "inactive") {
    filter.status = status;
  }

  const items = await User.find(filter)
    .select("name email whatsapp role emailVerified status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: Request) {
  const { access, error } = await requirePermissionWithAccess("users", "create");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = adminUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (access.role !== "super_admin" && parsed.data.role !== "student") {
    return NextResponse.json(
      { error: "Only a super admin can create admin accounts" },
      { status: 403 },
    );
  }

  await connectDB();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp,
    passwordHash,
    role: parsed.data.role,
    // Only plain admins carry a permission set.
    permissions: parsed.data.role === "admin" ? (parsed.data.permissions ?? {}) : {},
    emailVerified: true,
  });

  return NextResponse.json(
    {
      item: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    },
    { status: 201 },
  );
}
