import { crudHandlers } from "@/src/lib/api/crud";
import { TestSeries } from "@/src/modules/test-series/test-series.model";
import { testSeriesCreateSchema, testSeriesUpdateSchema } from "@/src/modules/test-series/schemas";

const handlers = crudHandlers(TestSeries, testSeriesCreateSchema, testSeriesUpdateSchema, {
  resource: "testSeries",
  populate: "examId",
});

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  return handlers.get(id);
}

export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  return handlers.update(id, req);
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id } = await params;
  return handlers.remove(id);
}
