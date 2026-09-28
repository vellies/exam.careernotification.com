"use client";

import { useState, type ReactNode } from "react";
import { BadgeCheck, CircleDashed, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  ACTIONS,
  RESOURCE_KEYS,
  RESOURCES,
  type Action,
  type Permissions,
} from "@/src/lib/auth/permissions";

export type UserPreview = {
  name: string;
  email: string;
  whatsapp?: string;
  role: string;
  emailVerified: boolean;
  status: string;
  /** Preformatted on the server so it matches between server and client. */
  joined: string;
  /** Only passed for admins, and only when the viewer is a super admin. */
  permissions?: Permissions;
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  admin: "Admin",
  super_admin: "Super Admin",
};

const ACTION_LABELS: Record<Action, string> = {
  create: "Add",
  read: "View",
  update: "Edit",
  delete: "Delete",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function UserPreviewButton({ user }: { user: UserPreview }) {
  const [open, setOpen] = useState(false);
  const granted = user.permissions
    ? RESOURCE_KEYS.map((resource) => ({
        resource,
        actions: ACTIONS.filter((a) => user.permissions?.[resource]?.[a]),
      })).filter((row) => row.actions.length > 0)
    : null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        aria-label="View user"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Eye className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <AlertDialogTitle>{user.name}</AlertDialogTitle>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

        <dl className="mt-4 divide-y divide-border text-sm">
          <Row label="WhatsApp">{user.whatsapp || "—"}</Row>
          <Row label="Role">{ROLE_LABELS[user.role] ?? user.role}</Row>
          <Row label="Email verified">
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <BadgeCheck className="size-4" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CircleDashed className="size-4" /> Not verified
              </span>
            )}
          </Row>
          <Row label="Status">
            <StatusBadge status={user.status} />
          </Row>
          <Row label="Joined">{user.joined}</Row>
        </dl>

        {user.role === "super_admin" ? (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
            Super admins have full access to everything.
          </p>
        ) : granted ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Permissions
            </p>
            {granted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions granted yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {granted.map(({ resource, actions }) => (
                  <li key={resource} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{RESOURCES[resource].label}</span>
                    <span className="flex flex-wrap gap-1">
                      {actions.map((a) => (
                        <span
                          key={a}
                          className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {ACTION_LABELS[a]}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
