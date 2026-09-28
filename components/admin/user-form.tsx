"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/ui/voice-input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIONS,
  RESOURCE_KEYS,
  RESOURCES,
  type Action,
  type Permissions,
  type Resource,
} from "@/src/lib/auth/permissions";

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

export function UserForm({
  id,
  isSuperAdmin = false,
  isSelf = false,
  initial,
}: {
  id?: string;
  /** Only a super admin may set roles and permissions. */
  isSuperAdmin?: boolean;
  /** Editing your own account: your role can't be changed. */
  isSelf?: boolean;
  initial: {
    name: string;
    email: string;
    whatsapp: string;
    password: string;
    role: string;
    permissions: Permissions;
    emailVerified: boolean;
    status: string;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const url = id ? `/api/admin/users/${id}` : "/api/admin/users";
    const method = id ? "PATCH" : "POST";
    // Roles and permissions are only sent by a super admin; the API rejects them otherwise.
    const access = isSuperAdmin
      ? {
          role: values.role,
          permissions: values.role === "admin" ? values.permissions : undefined,
        }
      : {};
    const payload = id
      ? {
          name: values.name,
          // Blank means "leave as is" — older accounts may not have a number.
          whatsapp: values.whatsapp.trim() || undefined,
          ...access,
          emailVerified: values.emailVerified,
          status: values.status,
        }
      : {
          name: values.name,
          email: values.email,
          whatsapp: values.whatsapp,
          password: values.password,
          role: "student",
          ...access,
        };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/admin/users");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">
        {id ? "Edit User" : "New User"}
      </h1>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <VoiceInput
            id="name"
            required
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            className="h-10 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <VoiceInput
            id="email"
            type="email"
            required
            disabled={Boolean(id)}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className="h-10 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <VoiceInput
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required={!id}
            value={values.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            className="h-10 rounded-lg"
            placeholder="+91 98765 43210"
          />
        </div>

        {!id ? (
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              required
              minLength={8}
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              className="h-10 rounded-lg"
              placeholder="At least 8 characters"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={values.role}
            onValueChange={(v) => set("role", v as string)}
            disabled={!isSuperAdmin || isSelf}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue>{(v: string) => ROLE_LABELS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              {isSuperAdmin ? (
                <>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </>
              ) : null}
            </SelectContent>
          </Select>
          {values.role === "super_admin" ? (
            <p className="text-xs text-muted-foreground">
              Super admins have full access to everything.
            </p>
          ) : null}
        </div>

        {isSuperAdmin && values.role === "admin" ? (
          <PermissionMatrix
            value={values.permissions}
            onChange={(permissions) => set("permissions", permissions)}
          />
        ) : null}

        {id ? (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Email verified</p>
              <Switch
                checked={values.emailVerified}
                onCheckedChange={(v) => set("emailVerified", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Account active</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to block this user from logging in.
                </p>
              </div>
              <Switch
                checked={values.status === "active"}
                onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Admin-created accounts are marked as verified automatically.
          </p>
        )}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/users">Cancel</Link>}
        />
      </div>
    </form>
  );
}

function PermissionMatrix({
  value,
  onChange,
}: {
  value: Permissions;
  onChange: (next: Permissions) => void;
}) {
  function toggle(resource: Resource, action: Action, checked: boolean) {
    const row = { ...value[resource] };
    row[action] = checked;
    // The other actions all start from the list page, so they imply view;
    // taking view away takes the rest with it.
    if (checked && action !== "read") row.read = true;
    if (!checked && action === "read") {
      for (const a of ACTIONS) row[a] = false;
    }
    onChange({ ...value, [resource]: row });
  }

  function setAll(checked: boolean) {
    const next: Permissions = {};
    for (const resource of RESOURCE_KEYS) {
      next[resource] = Object.fromEntries(RESOURCES[resource].actions.map((a) => [a, checked]));
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Label>Permissions</Label>
          <p className="text-xs text-muted-foreground">What this admin can do in each area.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
            Grant all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
            Clear
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-left">
              <th className="px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Area
              </th>
              {ACTIONS.map((action) => (
                <th
                  key={action}
                  className="px-2 py-2 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {RESOURCE_KEYS.map((resource) => {
              const supported: readonly Action[] = RESOURCES[resource].actions;
              return (
                <tr key={resource}>
                  <td className="px-3 py-2 font-medium">{RESOURCES[resource].label}</td>
                  {ACTIONS.map((action) => (
                    <td key={action} className="px-2 py-2 text-center">
                      {supported.includes(action) ? (
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer rounded accent-primary align-middle"
                          checked={value[resource]?.[action] === true}
                          onChange={(e) => toggle(resource, action, e.target.checked)}
                          aria-label={`${ACTION_LABELS[action]} ${RESOURCES[resource].label}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
