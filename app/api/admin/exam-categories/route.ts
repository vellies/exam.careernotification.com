import { crudHandlers } from "@/src/lib/api/crud";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import {
  examCategoryCreateSchema,
  examCategoryUpdateSchema,
} from "@/src/modules/exams/schemas";

const handlers = crudHandlers(ExamCategory, examCategoryCreateSchema, examCategoryUpdateSchema, {
  resource: "exams",
  searchFields: ["name", "slug"],
});

export const GET = handlers.list;
export const POST = handlers.create;
