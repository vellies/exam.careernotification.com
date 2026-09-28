import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/src/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ message: "Logged out" });
}
