import { crudHandlers } from "@/src/lib/api/crud";
import { Exam } from "@/src/modules/exams/exam.model";
import { examCreateSchema, examUpdateSchema } from "@/src/modules/exams/schemas";

const handlers = crudHandlers(Exam, examCreateSchema, examUpdateSchema, {
  resource: "exams",
  populate: "examCategoryId",
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
