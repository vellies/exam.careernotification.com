import { crudHandlers } from "@/src/lib/api/crud";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { testSeriesCreateSchema, testSeriesUpdateSchema } from "@/src/modules/test-series/schemas";

const handlers = crudHandlers(TestSeries, testSeriesCreateSchema, testSeriesUpdateSchema, {
  resource: "testSeries",
  searchFields: ["title","slug"],
  populate: "examId",
});

export const GET = handlers.list;
export const POST = handlers.create;
