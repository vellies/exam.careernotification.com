import { crudHandlers } from "@/src/lib/api/crud";
import { Board } from "@/src/modules/syllabus/board.model";
import { boardCreateSchema, boardUpdateSchema } from "@/src/modules/syllabus/schemas";

const handlers = crudHandlers(Board, boardCreateSchema, boardUpdateSchema, {
  resource: "syllabus",
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
