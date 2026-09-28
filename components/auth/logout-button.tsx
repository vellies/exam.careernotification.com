"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  redirectTo = "/login",
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [redirecting, startRedirect] = useTransition();

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    startRedirect(() => {
      router.push(redirectTo);
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading || redirecting}
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="size-4" strokeWidth={1.75} />
      {loading || redirecting ? "Logging out…" : "Log out"}
    </button>
  );
}
