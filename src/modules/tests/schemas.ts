import { z } from "zod";

const statusEnum = z.enum(["draft", "published", "archived"]);

export const testCreateSchema = z
  .object({
    title: z.string().trim().min(2, "Title is too short"),
    titleTa: z.string().trim().optional().default(""),
    testSeriesId: z.string().trim().min(1, "Test series is required"),
    durationSeconds: z.coerce.number().int().positive().default(3600),
    negativeMarking: z.coerce.boolean().default(true),
    defaultNegativeMarks: z.coerce.number().min(0).default(0.25),
    shuffleQuestions: z.coerce.boolean().default(false),
    shuffleOptions: z.coerce.boolean().default(true),
    opensAt: z.coerce.date({ error: "Start date & time is required" }),
    closesAt: z.coerce.date({ error: "End date & time is required" }),
    status: statusEnum.default("draft"),
  })
  .refine((d) => d.closesAt > d.opensAt, {
    message: "End date & time must be after the start",
    path: ["closesAt"],
  });

export const testUpdateSchema = z
  .object({
  title: z.string().trim().min(2).optional(),
  titleTa: z.string().trim().optional(),
  testSeriesId: z.string().trim().min(1).optional(),
  durationSeconds: z.coerce.number().int().positive().optional(),
  negativeMarking: z.coerce.boolean().optional(),
  defaultNegativeMarks: z.coerce.number().min(0).optional(),
  shuffleQuestions: z.coerce.boolean().optional(),
  shuffleOptions: z.coerce.boolean().optional(),
  opensAt: z.coerce.date({ error: "Start date & time is required" }).optional(),
  closesAt: z.coerce.date({ error: "End date & time is required" }).optional(),
  status: statusEnum.optional(),
  })
  .refine((d) => !d.opensAt || !d.closesAt || d.closesAt > d.opensAt, {
    message: "End date & time must be after the start",
    path: ["closesAt"],
  });

export const addTestQuestionSchema = z.object({
  questionId: z.string().trim().min(1, "Question is required"),
  marks: z.coerce.number().positive().default(1),
  negativeMarks: z.coerce.number().min(0).default(0),
});

export const autoFillTestQuestionsSchema = z.object({
  subjectId: z.string().trim().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  count: z.coerce.number().int().positive().max(200),
  marks: z.coerce.number().positive().default(1),
  negativeMarks: z.coerce.number().min(0).default(0),
});

export const importTestQuestionsSchema = z.object({
  // Each item is validated separately (questionImportItemSchema) so errors can
  // name the offending question.
  questions: z
    .array(z.unknown())
    .min(1, "The JSON has no questions")
    .max(200, "Import at most 200 questions at a time"),
  subjectId: z.string().trim().min(1).optional(),
  marks: z.coerce.number().positive().default(1),
  negativeMarks: z.coerce.number().min(0).default(0),
});
