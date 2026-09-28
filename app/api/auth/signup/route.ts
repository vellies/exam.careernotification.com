import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { signupSchema } from "@/src/modules/users/schemas";
import { hashPassword } from "@/src/lib/auth/password";
import { createToken, addHours } from "@/src/lib/auth/tokens";
import { sendVerificationEmail } from "@/src/lib/email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, email, whatsapp, password } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const { token, tokenHash } = createToken();

  try {
    await User.create({
      name,
      email,
      whatsapp,
      passwordHash,
      role: "student",
      emailVerified: false,
      verificationTokenHash: tokenHash,
      verificationExpires: addHours(24),
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  await sendVerificationEmail(email, name, token);

  return NextResponse.json({
    message: "Account created. Check your email to verify your address.",
  });
}
