import { z } from "zod";
import { sluggableName, slugify, withSlugFrom } from "@/src/lib/slug";
import { EXAM_CATEGORY_TYPE_VALUES } from "./category-types";

export const examCategoryCreateSchema = z
  .object({
    name: sluggableName("Name"),
    nameTa: z.string().trim().optional().default(""),
    type: z.enum(EXAM_CATEGORY_TYPE_VALUES).default("others"),
    sortOrder: z.coerce.number().optional().default(0),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .transform((data) => ({
    ...data,
    slug: slugify(data.name),
  }));

export const examCategoryUpdateSchema = z.object({
  name: sluggableName("Name").optional(),
  nameTa: z.string().trim().optional(),
  type: z.enum(EXAM_CATEGORY_TYPE_VALUES).optional(),
  sortOrder: z.coerce.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).transform(withSlugFrom("name"));

export const examCreateSchema = z
  .object({
    name: sluggableName("Name"),
    nameTa: z.string().trim().optional().default(""),
    examCategoryId: z.string().trim().min(1, "Category is required"),
    description: z.string().trim().optional().default(""),
    descriptionTa: z.string().trim().optional().default(""),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .transform((data) => ({
    ...data,
    slug: slugify(data.name),
  }));

export const examUpdateSchema = z.object({
  name: sluggableName("Name").optional(),
  nameTa: z.string().trim().optional(),
  examCategoryId: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  descriptionTa: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).transform(withSlugFrom("name"));
