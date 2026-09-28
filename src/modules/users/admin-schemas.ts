import { z } from "zod";
import { whatsappSchema } from "@/src/modules/users/schemas";
import { ROLES, sanitizePermissions } from "@/src/lib/auth/permissions";

const permissionsSchema = z.unknown().transform(sanitizePermissions);

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  whatsapp: whatsappSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES).default("student"),
  permissions: permissionsSchema.optional(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  // Optional so older accounts without a number can still be edited.
  whatsapp: whatsappSchema.optional(),
  role: z.enum(ROLES).optional(),
  permissions: permissionsSchema.optional(),
  emailVerified: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
