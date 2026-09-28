"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { isAdminRole } from "@/src/lib/auth/permissions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/overview";
  const verify = searchParams.get("verify");
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);
  // Keeps the button busy until the destination page has actually rendered.
  const [redirecting, startRedirect] = useTransition();
  const [resent, setResent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      if (data.code === "unverified") setUnverified(true);
      setError(data.error ?? "Something went wrong");
      return;
    }

    // One login for everyone: send admins to the admin panel, students to their area.
    const isAdmin = isAdminRole(data.user?.role);
    const wantsAdminArea = next.startsWith("/admin");
    const destination = isAdmin
      ? wantsAdminArea ? next : "/admin/dashboard"
      : wantsAdminArea ? "/overview" : next;
    startRedirect(() => {
      router.push(destination);
      router.refresh();
    });
    setLoading(false);
  }

  async function handleResend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back to VR TEST BATCH.
      </p>

      {verify === "success" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Email verified. You can log in now.
        </p>
      ) : null}
      {verify === "invalid" ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          That verification link is invalid or has expired.
        </p>
      ) : null}
      {reason === "disabled" ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          Your account has been disabled. Contact support for help.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
            placeholder="Your password"
          />
        </div>

        {error ? (
          <div className="text-sm font-medium text-destructive">
            {error}
            {unverified ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resent}
                className="ml-2 font-medium text-primary underline disabled:opacity-60"
              >
                {resent ? "Verification email sent" : "Resend email"}
              </button>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={loading || redirecting}
          className="h-11 w-full rounded-lg text-sm"
        >
          {loading || redirecting ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to VR TEST BATCH?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
