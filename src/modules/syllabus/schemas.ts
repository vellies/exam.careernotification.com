import { z } from "zod";
import { sluggableName, slugify, withSlugFrom } from "@/src/lib/slug";

const statusEnum = z.enum(["active", "inactive"]);

export const boardCreateSchema = z
  .object({
    name: sluggableName("Name"),
    nameTa: z.string().trim().optional().default(""),
    status: statusEnum.default("active"),
  })
  .transform((data) => ({ ...data, slug: slugify(data.name) }));

export const boardUpdateSchema = z.object({
  name: sluggableName("Name").optional(),
  nameTa: z.string().trim().optional(),
  status: statusEnum.optional(),
}).transform(withSlugFrom("name"));

/** Slug for a Tamil-only name: keeps Tamil letters and vowel signs instead of stripping them. */
const unicodeSlug = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** English name is optional here, but if given it must still produce a slug. */
const optionalEnglishName = z
  .string()
  .trim()
  .refine((v) => v === "" || v.length >= 2, "Name is too short")
  .refine((v) => v === "" || slugify(v) !== "", "Name must contain English letters or numbers");

const NAME_REQUIRED = "Enter the name in English or Tamil";

/**
 * Topics need an English or a Tamil name. A Tamil-only topic also stores the
 * Tamil text in `name` so every place that shows `name` still has a label.
 */
const withBilingualName = <T extends { name?: string; nameTa?: string }>(data: T) => {
  if (data.name) return { ...data, slug: slugify(data.name) };
  if (data.nameTa) return { ...data, name: data.nameTa, slug: unicodeSlug(data.nameTa) };
  return data;
};

export const subjectCreateSchema = z
  .object({
    name: optionalEnglishName.optional().default(""),
    nameTa: z.string().trim().optional().default(""),
    boardId: z.string().trim().min(1, "Board is required"),
    description: z.string().trim().optional().default(""),
    descriptionTa: z.string().trim().optional().default(""),
    status: statusEnum.default("active"),
  })
  .refine((data) => data.name || data.nameTa, { message: NAME_REQUIRED, path: ["name"] })
  .transform((data) => withBilingualName(data) as typeof data & { slug: string });

export const subjectUpdateSchema = z.object({
  name: optionalEnglishName.optional(),
  nameTa: z.string().trim().optional(),
  boardId: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  descriptionTa: z.string().trim().optional(),
  status: statusEnum.optional(),
})
  // Clearing the English name is only allowed when a Tamil name is sent with it.
  .refine((data) => data.name !== "" || data.nameTa, { message: NAME_REQUIRED, path: ["name"] })
  .transform(withBilingualName);
