import { z } from "zod";
import { sluggableName, slugify, withSlugFrom } from "@/src/lib/slug";

export const testSeriesCreateSchema = z
  .object({
    title: sluggableName("Title"),
    titleTa: z.string().trim().optional().default(""),
    examId: z.string().trim().min(1, "Exam is required"),
    description: z.string().trim().optional().default(""),
    descriptionTa: z.string().trim().optional().default(""),
    access: z.enum(["free", "paid", "subscription"]).default("free"),
    price: z.coerce.number().min(0).optional().default(0),
    startDate: z.coerce.date({ error: "Start date & time is required" }),
    endDate: z.coerce.date({ error: "End date & time is required" }),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date & time must be after the start",
    path: ["endDate"],
  })
  .transform((data) => ({ ...data, slug: slugify(data.title) }));

export const testSeriesUpdateSchema = z
  .object({
  title: sluggableName("Title").optional(),
  titleTa: z.string().trim().optional(),
  examId: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  descriptionTa: z.string().trim().optional(),
  access: z.enum(["free", "paid", "subscription"]).optional(),
  price: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date({ error: "Start date & time is required" }).optional(),
  endDate: z.coerce.date({ error: "End date & time is required" }).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
    message: "End date & time must be after the start",
    path: ["endDate"],
  })
  .transform(withSlugFrom("title"));
