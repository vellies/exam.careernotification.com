import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";
import { hashToken } from "@/src/lib/auth/tokens";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=missing", origin));
  }

  await connectDB();

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    verificationTokenHash: tokenHash,
    verificationExpires: { $gt: new Date() },
  }).select("+verificationTokenHash +verificationExpires");

  if (!user) {
    return NextResponse.redirect(new URL("/login?verify=invalid", origin));
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpires = undefined;
  await user.save();

  return NextResponse.redirect(new URL("/login?verify=success", origin));
}
