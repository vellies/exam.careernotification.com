import { crudHandlers } from "@/src/lib/api/crud";
import { Question } from "@/src/modules/questions/question.model";
import { questionCreateSchema, questionUpdateSchema } from "@/src/modules/questions/schemas";

const handlers = crudHandlers(Question, questionCreateSchema, questionUpdateSchema, {
  resource: "questions",
  searchFields: ["question.en","question.ta","tags"],
  populate: ["subjectId"],
});

export const GET = handlers.list;
export const POST = handlers.create;
