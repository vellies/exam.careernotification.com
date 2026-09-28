import { crudHandlers } from "@/src/lib/api/crud";
import { Question } from "@/src/modules/questions/question.model";
import { questionCreateSchema, questionUpdateSchema } from "@/src/modules/questions/schemas";

const handlers = crudHandlers(Question, questionCreateSchema, questionUpdateSchema, {
  resource: "questions",
  populate: ["subjectId"],
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
