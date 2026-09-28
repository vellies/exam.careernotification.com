import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-background to-rose-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-0">
        <Link href="/" className="mx-auto mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            VR
          </span>
          <span className="text-lg font-bold tracking-tight">
            VR TEST BATCH
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
