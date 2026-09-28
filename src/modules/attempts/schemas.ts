import { z } from "zod";

export const startAttemptSchema = z.object({
  testId: z.string().trim().min(1, "Test is required"),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().trim().min(1, "Question is required"),
  selectedOptionId: z.string().trim().min(1).nullable().optional(),
  flagged: z.boolean().optional(),
});
