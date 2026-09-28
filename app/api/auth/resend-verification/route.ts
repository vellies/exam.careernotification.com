import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { forgotPasswordSchema as emailSchema } from "@/src/modules/users/schemas";
import { createToken, addHours } from "@/src/lib/auth/tokens";
import { sendVerificationEmail } from "@/src/lib/email";

const GENERIC_MESSAGE =
  "If that account exists and isn't verified yet, we've sent a new link.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = emailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email });
  if (!user || user.emailVerified) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const { token, tokenHash } = createToken();
  user.verificationTokenHash = tokenHash;
  user.verificationExpires = addHours(24);
  await user.save();

  await sendVerificationEmail(email, user.name, token);

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
