import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { resetPasswordSchema } from "@/src/modules/users/schemas";
import { hashPassword } from "@/src/lib/auth/password";
import { hashToken } from "@/src/lib/auth/tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  await connectDB();

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetExpires: { $gt: new Date() },
  }).select("+resetTokenHash +resetExpires");

  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 },
    );
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  await user.save();

  return NextResponse.json({ message: "Password updated. You can now log in." });
}
