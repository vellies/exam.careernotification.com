import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { getSession, clearSessionCookie } from "@/src/lib/auth/session";
import { DISABLED_ACCOUNT_MESSAGE } from "@/src/lib/auth/account-status";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.sub);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if ((user.status ?? "active") !== "active") {
    await clearSessionCookie();
    return NextResponse.json(
      { user: null, error: DISABLED_ACCOUNT_MESSAGE, code: "disabled" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
}
