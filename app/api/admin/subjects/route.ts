import { crudHandlers } from "@/src/lib/api/crud";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { subjectCreateSchema, subjectUpdateSchema } from "@/src/modules/syllabus/schemas";

const handlers = crudHandlers(Subject, subjectCreateSchema, subjectUpdateSchema, {
  resource: "syllabus",
  searchFields: ["name","slug"],
  populate: "boardId",
});

export const GET = handlers.list;
export const POST = handlers.create;
