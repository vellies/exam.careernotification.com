import { crudHandlers } from "@/src/lib/api/crud";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import {
  examCategoryCreateSchema,
  examCategoryUpdateSchema,
} from "@/src/modules/exams/schemas";

const handlers = crudHandlers(ExamCategory, examCategoryCreateSchema, examCategoryUpdateSchema, {
  resource: "exams",
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
