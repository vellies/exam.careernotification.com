import { crudHandlers } from "@/src/lib/api/crud";
import { Subject } from "@/src/modules/syllabus/subject.model";
import { subjectCreateSchema, subjectUpdateSchema } from "@/src/modules/syllabus/schemas";

const handlers = crudHandlers(Subject, subjectCreateSchema, subjectUpdateSchema, {
  resource: "syllabus",
  populate: "boardId",
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
