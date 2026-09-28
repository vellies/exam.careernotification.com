import { localizedPair, type ListLang } from "@/src/lib/api/list-params";

/** A table name cell in the picked language only (falls back to the other when it's empty). */
export function LocalizedName({ lang, en, ta }: { lang: ListLang; en?: string | null; ta?: string | null }) {
  return <p>{localizedPair(lang, en, ta).primary}</p>;
}
