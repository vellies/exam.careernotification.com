import { crudHandlers } from "@/src/lib/api/crud";
import { Test } from "@/src/modules/tests/test.model";
import { testCreateSchema, testUpdateSchema } from "@/src/modules/tests/schemas";

const handlers = crudHandlers(Test, testCreateSchema, testUpdateSchema, {
  resource: "tests",
  searchFields: ["title"],
  populate: "testSeriesId",
});

export const GET = handlers.list;
export const POST = handlers.create;
