import { z } from "zod";

/** English, Tamil or both — at least one is required. */
const bilingualSchema = z
  .object({
    en: z.string().trim().optional().default(""),
    ta: z.string().trim().optional().default(""),
  })
  .refine((t) => t.en || t.ta, { message: "English or Tamil text is required" });

const optionSchema = z.object({
  id: z.string().trim().min(1),
  text: bilingualSchema,
});

const optionalRef = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const explanationSchema = z
  .object({
    en: z.string().trim().optional().default(""),
    ta: z.string().trim().optional().default(""),
  })
  .default({ en: "", ta: "" });

const typeEnum = z.enum(["mcq_single", "true_false", "integer"]);
const difficultyEnum = z.enum(["easy", "medium", "hard"]);
const statusEnum = z.enum(["draft", "published", "archived"]);

export const languageEnum = z.enum(["both", "en", "ta"]);
export type QuestionLanguage = z.infer<typeof languageEnum>;

const LANGUAGE_NAMES = { en: "English", ta: "Tamil" } as const;

/**
 * When the form says which language the question is in, the question and
 * every option must be filled in that language (both, for "both").
 */
function checkLanguage(
  d: {
    language?: QuestionLanguage;
    question?: { en: string; ta: string };
    options?: { id: string; text: { en: string; ta: string } }[];
  },
  ctx: z.RefinementCtx,
) {
  if (!d.language) return;
  const required = d.language === "both" ? (["en", "ta"] as const) : [d.language];
  for (const lang of required) {
    if (d.question && !d.question[lang]) {
      ctx.addIssue({ code: "custom", path: ["question", lang], message: `Question (${LANGUAGE_NAMES[lang]}) is required` });
    }
    d.options?.forEach((o, i) => {
      if (!o.text[lang]) {
        ctx.addIssue({
          code: "custom",
          path: ["options", i, "text", lang],
          message: `Option ${o.id} (${LANGUAGE_NAMES[lang]}) is required`,
        });
      }
    });
  }
}

// `language` only drives validation — it isn't stored on the question.
function dropLanguage<T extends { language?: unknown }>(data: T): Omit<T, "language"> {
  const rest = { ...data };
  delete rest.language;
  return rest;
}

export const questionCreateSchema = z
  .object({
    type: typeEnum.default("mcq_single"),
    question: bilingualSchema,
    options: z.array(optionSchema).default([]),
    correctAnswer: z.string().trim().min(1, "Correct answer is required"),
    explanation: explanationSchema,
    difficulty: difficultyEnum.default("medium"),
    subjectId: optionalRef,
    tags: z.array(z.string().trim()).default([]),
    status: statusEnum.default("published"),
    language: languageEnum.optional(),
  })
  .superRefine(checkLanguage)
  .transform(dropLanguage);

export const questionUpdateSchema = z
  .object({
    type: typeEnum.optional(),
    question: bilingualSchema.optional(),
    options: z.array(optionSchema).optional(),
    correctAnswer: z.string().trim().min(1).optional(),
    explanation: explanationSchema.optional(),
    difficulty: difficultyEnum.optional(),
    subjectId: optionalRef,
    tags: z.array(z.string().trim()).optional(),
    status: statusEnum.optional(),
    language: languageEnum.optional(),
  })
  .superRefine(checkLanguage)
  .transform(dropLanguage);

// ---- JSON import ----
// A friendlier shape than questionCreateSchema: text fields may be plain
// strings (English only), option IDs are auto-assigned A, B, C… when left out,
// and correctAnswer may be an option ID or the option's exact English/Tamil text.

const looseBilingual = z.preprocess(
  (v) => (typeof v === "string" ? { en: v } : v),
  bilingualSchema,
);

const importOptionSchema = z.preprocess(
  (v) => (typeof v === "string" ? { text: v } : v),
  z.object({
    id: z.string().trim().min(1).optional(),
    text: looseBilingual,
  }),
);

const TRUE_FALSE_OPTIONS = [
  { id: "A", text: { en: "True", ta: "சரி" } },
  { id: "B", text: { en: "False", ta: "தவறு" } },
];

export const questionImportItemSchema = z
  .object({
    type: typeEnum.default("mcq_single"),
    question: looseBilingual,
    options: z.array(importOptionSchema).default([]),
    correctAnswer: z
      .union([z.string(), z.number(), z.boolean()])
      .transform((v) => String(v).trim())
      .pipe(z.string().min(1, "Correct answer is required")),
    explanation: z
      .union([z.string().trim().transform((en) => ({ en, ta: "" })), explanationSchema])
      .default({ en: "", ta: "" }),
    difficulty: difficultyEnum.default("medium"),
    /** Subject name, slug or ID. Falls back to the import's default subject. */
    subject: z.string().trim().optional(),
    tags: z.array(z.string().trim()).default([]),
    /** Per-question overrides of the import's marks / negative marks. */
    marks: z.coerce.number().positive().optional(),
    negativeMarks: z.coerce.number().min(0).optional(),
  })
  .transform((q, ctx) => {
    if (q.type === "integer") {
      if (!/^-?\d+$/.test(q.correctAnswer)) {
        ctx.addIssue({ code: "custom", path: ["correctAnswer"], message: "Must be a whole number for an integer question" });
        return z.NEVER;
      }
      return { ...q, options: [] };
    }

    const options =
      q.type === "true_false" && q.options.length === 0
        ? TRUE_FALSE_OPTIONS
        : q.options.map((o, i) => ({ id: o.id ?? String.fromCharCode(65 + i), text: o.text }));

    if (options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Needs at least 2 options" });
      return z.NEVER;
    }
    if (new Set(options.map((o) => o.id)).size !== options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Option IDs must be unique" });
      return z.NEVER;
    }

    const answer = q.correctAnswer.toLowerCase();
    const match =
      options.find((o) => o.id.toLowerCase() === answer) ??
      options.find((o) => o.text.en.toLowerCase() === answer || o.text.ta.toLowerCase() === answer);
    if (!match) {
      ctx.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: `"${q.correctAnswer}" doesn't match any option ID or option text`,
      });
      return z.NEVER;
    }

    return { ...q, options, correctAnswer: match.id };
  });

export type QuestionImportItem = z.output<typeof questionImportItemSchema>;

/** The only keys a question may have on the Question Bank JSON import page. */
export const QUESTION_JSON_KEYS = ["question", "options", "correctAnswer", "explanation"] as const;

/**
 * Question Bank bulk import: the JSON holds only content (question, options,
 * answer, explanation); type, difficulty, subject, tags and status come from
 * the form and apply to every question.
 */
export const questionBulkImportSchema = z.object({
  questions: z
    .array(z.unknown())
    .min(1, "The JSON has no questions")
    .max(500, "Import at most 500 questions at a time"),
  type: typeEnum.default("mcq_single"),
  difficulty: difficultyEnum.default("medium"),
  subjectId: optionalRef,
  tags: z.array(z.string().trim()).default([]),
  status: statusEnum.default("published"),
  /** Which language(s) every question must have: English, Tamil or both. */
  language: languageEnum.default("both"),
});

/**
 * Enforces the chosen language on a parsed question: the chosen language(s)
 * must be filled in for the question and every option, and text in a language
 * that wasn't chosen is dropped so the stored question matches the choice.
 */
function applyLanguage(q: QuestionImportItem, language: QuestionLanguage) {
  const required = language === "both" ? (["en", "ta"] as const) : ([language] as const);
  const errors: string[] = [];
  const check = (text: { en: string; ta: string }, path: string) => {
    for (const lang of required) {
      if (!text[lang]) errors.push(`${path}.${lang}: ${LANGUAGE_NAMES[lang]} text is required`);
    }
  };
  check(q.question, "question");
  q.options.forEach((o, i) => check(o.text, `options.${i}.text`));
  if (errors.length > 0) return { ok: false as const, errors };

  const keep = (text: { en: string; ta: string }) =>
    language === "both" ? text : { en: language === "en" ? text.en : "", ta: language === "ta" ? text.ta : "" };
  return {
    ok: true as const,
    data: {
      ...q,
      question: keep(q.question),
      options: q.options.map((o) => ({ ...o, text: keep(o.text) })),
      explanation: keep(q.explanation),
    },
  };
}

/**
 * Validates one JSON question against the form settings. Returns the question
 * ready to save, or the error messages for it.
 */
export function parseJsonQuestion(
  raw: unknown,
  settings: {
    type: z.infer<typeof typeEnum>;
    difficulty: z.infer<typeof difficultyEnum>;
    tags: string[];
    language: QuestionLanguage;
  },
): { ok: true; data: QuestionImportItem } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["must be an object { ... }"] };
  }
  const unknown = Object.keys(raw).filter(
    (k) => !(QUESTION_JSON_KEYS as readonly string[]).includes(k),
  );
  if (unknown.length > 0) {
    return {
      ok: false,
      errors: [`unknown field${unknown.length === 1 ? "" : "s"} ${unknown.map((k) => `"${k}"`).join(", ")}`],
    };
  }
  const { language, ...fields } = settings;
  const result = questionImportItemSchema.safeParse({ ...raw, ...fields });
  if (result.success) return applyLanguage(result.data, language);
  return {
    ok: false,
    errors: result.error.issues.map((i) =>
      i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
    ),
  };
}
