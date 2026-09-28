import { Suspense, type ReactNode } from "react";
import { BadgeCheck, Mail, User as UserIcon, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/src/lib/auth/session";
import { connectDB } from "@/src/lib/mongodb";
import { User } from "@/src/modules/users/user.model";

export default async function ProfilePage() {
  const session = await getSession();

  const rows: { icon: typeof UserIcon; label: string; value: ReactNode }[] = [
    { icon: UserIcon, label: "Name", value: session?.name ?? "—" },
    { icon: Mail, label: "Email", value: session?.email ?? "—" },
    {
      icon: BadgeCheck,
      label: "Status",
      value: "Verified student account",
    },
    {
      icon: CalendarDays,
      label: "Member since",
      value: session ? (
        <Suspense fallback="…">
          <MemberSince userId={session.sub} />
        </Suspense>
      ) : (
        "—"
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted-foreground">
        Your account details on VR TEST BATCH.
      </p>

      <Card className="mt-8 max-w-xl border-border shadow-none">
        <CardContent className="divide-y divide-border p-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-4 px-6 py-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <row.icon className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm font-medium">{row.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function MemberSince({ userId }: { userId: string }) {
  await connectDB();
  const user = await User.findById(userId).select("createdAt").lean();
  if (!user?.createdAt) return "—";
  return new Date(user.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
