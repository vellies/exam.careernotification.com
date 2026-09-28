import { NextResponse } from "next/server";
import { requirePermission } from "@/src/lib/auth/guard";
import {
  EXTRACT_IMAGE_TYPES,
  EXTRACT_MAX_FILES,
  EXTRACT_MAX_IMAGE_BYTES,
  EXTRACT_MAX_TOTAL_BYTES,
  EXTRACT_PDF_TYPE,
  ExtractError,
  extractQuestions,
  type ExtractFile,
} from "@/src/modules/questions/extract";

// Reading a long question paper can take a few minutes.
export const maxDuration = 300;

const ALLOWED_TYPES: readonly string[] = [EXTRACT_PDF_TYPE, ...EXTRACT_IMAGE_TYPES];
const QUESTION_TYPES = ["mcq_single", "true_false", "integer"] as const;
const MB = 1024 * 1024;

/**
 * OCR / AI extraction: takes a question paper as PDF or images (multipart
 * "files") and returns questions in the JSON import format. Nothing is saved —
 * the admin reviews the JSON and imports it as usual.
 */
export async function POST(request: Request) {
  const guard = await requirePermission("questions", "create");
  if (guard) return guard;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Upload a PDF or image" }, { status: 400 });

  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (uploads.length === 0) {
    return NextResponse.json({ error: "Upload a PDF or image" }, { status: 400 });
  }
  if (uploads.length > EXTRACT_MAX_FILES) {
    return NextResponse.json({ error: `Upload at most ${EXTRACT_MAX_FILES} files at a time` }, { status: 400 });
  }

  let total = 0;
  for (const f of uploads) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return NextResponse.json(
        { error: `${f.name}: only PDF, PNG, JPG, WEBP or GIF files are supported` },
        { status: 400 },
      );
    }
    if (f.type !== EXTRACT_PDF_TYPE && f.size > EXTRACT_MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${f.name}: images must be under ${EXTRACT_MAX_IMAGE_BYTES / MB} MB` },
        { status: 400 },
      );
    }
    total += f.size;
  }
  if (total > EXTRACT_MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: `Files add up to more than ${EXTRACT_MAX_TOTAL_BYTES / MB} MB — split them up` },
      { status: 400 },
    );
  }

  const files: ExtractFile[] = await Promise.all(
    uploads.map(async (f) => ({ name: f.name, type: f.type, data: Buffer.from(await f.arrayBuffer()) })),
  );
  const typeField = form.get("type");
  const type = QUESTION_TYPES.find((t) => t === typeField);

  try {
    const result = await extractQuestions(files, {
      inferAnswers: form.get("inferAnswers") !== "false",
      type,
    });
    if (result.questions.length === 0) {
      return NextResponse.json({ error: "No questions were found in the file" }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ExtractError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Question extraction failed", err);
    return NextResponse.json({ error: "Extraction failed — try again" }, { status: 500 });
  }
}
