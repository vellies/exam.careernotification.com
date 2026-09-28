import { crudHandlers } from "@/src/lib/api/crud";
import { Test } from "@/src/modules/tests/test.model";
import { testCreateSchema, testUpdateSchema } from "@/src/modules/tests/schemas";

const handlers = crudHandlers(Test, testCreateSchema, testUpdateSchema, {
  resource: "tests",
  populate: ["testSeriesId", "questions.questionId"],
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
