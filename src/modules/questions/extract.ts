import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// ---- OCR / AI extraction ----
// Reads a question paper (PDF or images) with Claude and returns questions in
// the JSON import format, ready to review in the import editor.

export const EXTRACT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const EXTRACT_PDF_TYPE = "application/pdf";
/** The API limit per image. */
export const EXTRACT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Total upload size; base64 adds a third and the request limit is 32 MB. */
export const EXTRACT_MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const EXTRACT_MAX_FILES = 20;

type ImageType = (typeof EXTRACT_IMAGE_TYPES)[number];
type QuestionType = "mcq_single" | "true_false" | "integer";

const text = z.object({
  en: z.string().describe("English text, or empty string if the document has none"),
  ta: z.string().describe("Tamil text, or empty string if the document has none"),
});

const extractedSchema = z.object({
  questions: z.array(
    z.object({
      type: z.enum(["mcq_single", "true_false", "integer"]),
      question: text,
      options: z.array(z.object({ id: z.string(), text })),
      correctAnswer: z
        .string()
        .describe('Option ID like "B", or the whole number for integer questions. Empty string if unknown.'),
      answerSource: z.enum(["document", "inferred", "missing"]),
      explanation: text,
      difficulty: z.enum(["easy", "medium", "hard"]),
      subject: z.string().describe("Subject if the paper states it, else empty string"),
      tags: z.array(z.string()),
    }),
  ),
});

function systemPrompt(inferAnswers: boolean) {
  const answerPolicy = inferAnswers
    ? 'work out the correct answer yourself and set answerSource "inferred". If you genuinely cannot tell, set correctAnswer "" and answerSource "missing".'
    : 'set correctAnswer "" and answerSource "missing".';
  const explain = inferAnswers ? ", or you inferred the answer (then add a one-line reason)" : "";

  return `You extract exam questions from scanned or digital question papers (often Tamil Nadu competitive exams such as TNPSC) into structured data.

Rules:
- Extract every question in the document, in order. Do not skip, merge or invent questions.
- Copy text exactly as printed, fixing only obvious OCR noise. Keep Tamil in Tamil script and English in English. If the paper prints a question in both languages, fill both "en" and "ta"; if only one language is printed, leave the other as an empty string. Do not translate.
- Drop question numbers ("1.", "Q12") and option labels ("(A)", "அ)") from the text.
- Options get IDs A, B, C, D… in printed order. Tamil labels அ, ஆ, இ, ஈ map to A, B, C, D.
- type: "mcq_single" for multiple-choice; "true_false" for true/false or சரி/தவறு questions (options A = True, B = False); "integer" when the answer is a whole number with no options (options = []).
- correctAnswer: the option ID, or the number for integer questions. If the document marks the answer or has an answer key, use it and set answerSource "document". Otherwise ${answerPolicy}
- explanation: only if the document gives one${explain}; otherwise empty strings.
- difficulty: your best judgement. tags: 1–3 short lowercase topic tags (e.g. "polity", "history").
- Write mathematical expressions in plain text. Skip instructions, headers and page furniture.`;
}

export type ExtractFile = { name: string; type: string; data: Buffer };

export type ExtractResult = {
  questions: Record<string, unknown>[];
  warnings: string[];
};

export class ExtractError extends Error {}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ExtractError("ANTHROPIC_API_KEY is not set on the server");
  }
  client ??= new Anthropic();
  return client;
}

function toContent(files: ExtractFile[]): Anthropic.Beta.BetaContentBlockParam[] {
  return files.map((f) =>
    f.type === EXTRACT_PDF_TYPE
      ? {
          type: "document",
          title: f.name,
          source: { type: "base64", media_type: EXTRACT_PDF_TYPE, data: f.data.toString("base64") },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: f.type as ImageType, data: f.data.toString("base64") },
        },
  );
}

/** Keeps only the languages present: { en, ta } → "text" or { en, ta }. */
function tidyText(t: { en: string; ta: string }) {
  const en = t.en.trim();
  const ta = t.ta.trim();
  return en && ta ? { en, ta } : en ? en : ta ? { ta } : "";
}

export async function extractQuestions(
  files: ExtractFile[],
  options: { inferAnswers: boolean; type?: QuestionType },
): Promise<ExtractResult> {
  const instruction = options.type
    ? `Extract all questions from the attached file(s). They are all type "${options.type}".`
    : "Extract all questions from the attached file(s).";

  const stream = getClient().beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: options.inferAnswers ? "high" : "medium", format: betaZodOutputFormat(extractedSchema) },
    system: systemPrompt(options.inferAnswers),
    messages: [{ role: "user", content: [...toContent(files), { type: "text", text: instruction }] }],
  });

  let message;
  try {
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      throw new ExtractError(`The file couldn't be read: ${err.message}`);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractError("The AI service is busy — try again in a minute");
    }
    throw err;
  }

  if (message.stop_reason === "refusal") {
    throw new ExtractError("The AI declined to process this file");
  }
  if (message.stop_reason === "max_tokens") {
    throw new ExtractError("The document is too long to extract in one go — split it into smaller files");
  }
  const parsed = message.parsed_output;
  if (!parsed) throw new ExtractError("The AI response couldn't be read — try again");

  const warnings: string[] = [];
  const questions = parsed.questions.map((q, i) => {
    const n = i + 1;
    if (q.answerSource === "inferred") warnings.push(`Question ${n} — answer worked out by AI, please verify`);
    if (q.answerSource === "missing" || !q.correctAnswer.trim()) {
      warnings.push(`Question ${n} — no answer found, fill in correctAnswer`);
    }

    const out: Record<string, unknown> = { type: q.type, question: tidyText(q.question) };
    if (q.type !== "integer") {
      out.options = q.options.map((o) => ({ id: o.id, text: tidyText(o.text) }));
    }
    const answer = q.correctAnswer.trim();
    out.correctAnswer = q.type === "integer" && /^-?\d+$/.test(answer) ? Number(answer) : answer;
    const explanation = tidyText(q.explanation);
    if (explanation) out.explanation = explanation;
    out.difficulty = q.difficulty;
    if (q.subject.trim()) out.subject = q.subject.trim();
    if (q.tags.length) out.tags = q.tags;
    return out;
  });

  return { questions, warnings };
}
