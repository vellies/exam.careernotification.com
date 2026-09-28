import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { loginSchema } from "@/src/modules/users/schemas";
import { verifyPassword } from "@/src/lib/auth/password";
import { setSessionCookie } from "@/src/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: "Incorrect email or password" },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Incorrect email or password" },
      { status: 401 },
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before logging in", code: "unverified" },
      { status: 403 },
    );
  }

  if (user.status === "inactive") {
    return NextResponse.json(
      { error: "Your account has been disabled. Contact support for help.", code: "disabled" },
      { status: 403 },
    );
  }

  await setSessionCookie({
    sub: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
