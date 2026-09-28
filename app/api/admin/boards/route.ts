import { crudHandlers } from "@/src/lib/api/crud";
import { Board } from "@/src/modules/syllabus/board.model";
import { boardCreateSchema, boardUpdateSchema } from "@/src/modules/syllabus/schemas";

const handlers = crudHandlers(Board, boardCreateSchema, boardUpdateSchema, {
  resource: "syllabus",
  searchFields: ["name","slug"],
});

export const GET = handlers.list;
export const POST = handlers.create;
