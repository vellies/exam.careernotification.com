import { crudHandlers } from "@/src/lib/api/crud";
import { Exam } from "@/src/modules/exams/exam.model";
import { examCreateSchema, examUpdateSchema } from "@/src/modules/exams/schemas";

const handlers = crudHandlers(Exam, examCreateSchema, examUpdateSchema, {
  resource: "exams",
  searchFields: ["name", "slug"],
  populate: "examCategoryId",
});

export const GET = handlers.list;
export const POST = handlers.create;
