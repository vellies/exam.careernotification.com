import { z } from "zod";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A required name/title the record's slug is generated from. Rejects names
 * with no English letters or digits, since those would produce an empty slug.
 */
export const sluggableName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} is too short`)
    .refine((v) => slugify(v) !== "", `${label} must contain English letters or numbers`);

/** Adds `slug` derived from `source` when present (for partial updates). */
export function withSlugFrom<K extends string>(key: K) {
  return <T extends Partial<Record<K, string>>>(data: T) =>
    data[key] ? { ...data, slug: slugify(data[key] as string) } : data;
}
