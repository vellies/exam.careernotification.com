import { NextResponse } from "next/server";
import type { Model } from "mongoose";
import type { ZodType } from "zod";
import { connectDB } from "@/src/lib/mongodb";
import { requirePermission } from "@/src/lib/auth/guard";
import type { Resource } from "@/src/lib/auth/permissions";
import { findBlockingReferences } from "@/src/lib/api/dependents";

type CrudOptions = {
  /** Permission area each operation is checked against (create/read/update/delete). */
  resource: Resource;
  searchFields?: string[];
  defaultLimit?: number;
  populate?: string | string[];
};

/**
 * Thin, permission-checked CRUD wiring shared across the reference-data entities
 * (exam categories, syllabus hierarchy, test series, ...). Each route.ts file
 * still exists per Next.js convention, but just delegates here.
 */
export function crudHandlers<
  TCreate extends Record<string, unknown>,
  TUpdate extends Record<string, unknown>,
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>,
  createSchema: ZodType<TCreate>,
  updateSchema: ZodType<TUpdate>,
  options: CrudOptions,
) {
  async function list(request: Request) {
    const guard = await requirePermission(options.resource, "read");
    if (guard) return guard;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(
      Number(searchParams.get("limit") ?? options.defaultLimit ?? 100),
      200,
    );
    const q = searchParams.get("q")?.trim();

    const filter: Record<string, unknown> = {};
    if (q && options.searchFields?.length) {
      filter.$or = options.searchFields.map((field) => ({
        [field]: { $regex: q, $options: "i" },
      }));
    }

    // Any other query param is treated as a plain equality filter, e.g.
    // ?status=published or ?testSeriesId=<id>. A repeated param matches any of
    // its values, e.g. ?subjectId=a&subjectId=b.
    for (const key of new Set(searchParams.keys())) {
      if (["page", "limit", "q"].includes(key)) continue;
      const values = searchParams.getAll(key);
      filter[key] = values.length > 1 ? { $in: values } : values[0];
    }

    let query = model
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (options.populate) query = query.populate(options.populate);

    const [items, total] = await Promise.all([
      query.lean(),
      model.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
  }

  async function create(request: Request) {
    const guard = await requirePermission(options.resource, "create");
    if (guard) return guard;

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    await connectDB();

    try {
      const doc = await model.create(parsed.data);
      return NextResponse.json({ item: doc }, { status: 201 });
    } catch (err: unknown) {
      return handleWriteError(err);
    }
  }

  async function get(id: string) {
    const guard = await requirePermission(options.resource, "read");
    if (guard) return guard;

    await connectDB();
    let query = model.findById(id);
    if (options.populate) query = query.populate(options.populate);
    const doc = await query.lean();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item: doc });
  }

  async function update(id: string, request: Request) {
    const guard = await requirePermission(options.resource, "update");
    if (guard) return guard;

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    await connectDB();

    try {
      const doc = await model.findByIdAndUpdate(id, parsed.data, {
        new: true,
        runValidators: true,
      });
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ item: doc });
    } catch (err: unknown) {
      return handleWriteError(err);
    }
  }

  async function remove(id: string) {
    const guard = await requirePermission(options.resource, "delete");
    if (guard) return guard;

    await connectDB();

    const blocked = await findBlockingReferences(model.modelName, id);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 409 });
    }

    const doc = await model.findByIdAndDelete(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Deleted" });
  }

  return { list, create, get, update, remove };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

function handleWriteError(err: unknown) {
  if (isDuplicateKeyError(err)) {
    // Slugs are generated from the name, so a slug clash means a name clash.
    const keys = Object.keys((err as { keyValue?: object }).keyValue ?? {});
    return NextResponse.json(
      {
        error: keys.includes("slug")
          ? "A record with this name already exists"
          : "A record with this value already exists",
      },
      { status: 409 },
    );
  }
  if (err instanceof Error && err.name === "ValidationError") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof Error && err.name === "CastError") {
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  }
  throw err;
}
