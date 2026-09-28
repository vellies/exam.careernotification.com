import { z } from "zod";

export const whatsappSchema = z
  .string({ error: "WhatsApp number is required" })
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .pipe(
    z.string().regex(/^\+?\d{10,15}$/, "Enter a valid WhatsApp number (10–15 digits)"),
  );

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  whatsapp: whatsappSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
