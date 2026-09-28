import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { forgotPasswordSchema } from "@/src/modules/users/schemas";
import { createToken, addHours } from "@/src/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/src/lib/email";

const GENERIC_MESSAGE =
  "If an account exists for that email, a reset link has been sent.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email });

  // Always return the same response so we don't leak which emails are registered.
  if (!user) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const { token, tokenHash } = createToken();
  user.resetTokenHash = tokenHash;
  user.resetExpires = addHours(1);
  await user.save();

  await sendPasswordResetEmail(email, user.name, token);

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
