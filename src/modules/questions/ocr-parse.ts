// ---- Plain-OCR parsing (no AI) ----
// Turns the raw text of a question paper into questions in the JSON import
// format using the usual print conventions: numbered questions ("12." / "Q12)"),
// lettered options ("(A)", "B)", "C.", "அ)"), "Answer: B" lines and an answer
// key section at the end ("1. B  2. C" / "1-B"). English and Tamil are told
// apart by script, so bilingual papers fill both { en, ta }.

type Bilingual = string | { en?: string; ta?: string };

export type ParsedQuestion = {
  type: "mcq_single" | "true_false" | "integer";
  question: Bilingual;
  options?: { id: string; text: Bilingual }[];
  correctAnswer: string | number;
};

export type ParseResult = { questions: ParsedQuestion[]; warnings: string[] };

const TAMIL_LETTERS: Record<string, string> = { "அ": "A", "ஆ": "B", "இ": "C", "ஈ": "D" };

const QUESTION_START = /^(?:Q\.?\s*|கே\.?\s*)?(\d{1,3})\s*[.)]\s*(.*)$/i;
const ANSWER_LINE =
  /^(?:ans(?:wer)?|correct\s+answer|விடை)\s*[:.\-–]?\s*\(?\s*([A-Da-dஅஆஇஈ]|-?\d+|true|false|சரி|தவறு)\s*\)?/i;
const ANSWER_KEY_HEADING = /^(?:answer\s*key|answers|key\s*answers|விடைக்\s*குறிப்பு|விடைகள்)\s*:?\s*$/i;
const KEY_PAIR = /(\d{1,3})\s*[.):\-–]\s*\(?\s*([A-Da-dஅஆஇஈ]|-?\d+)\s*\)?(?=\s|,|$)/g;
// "(A) " "A) " "(a) " "a) " "A. " "அ) " "(அ) " at the start of the line or after a space.
const OPTION_MARKER = /(?:^|\s)(?:\(\s*([A-Da-dஅஆஇஈ])\s*\)\s*|([A-Da-dஅஆஇஈ])\)\s*|([A-D])\.\s+)/g;

const isTamil = (s: string) => {
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  const tamil = letters.replace(/[^஀-௿]/g, "");
  return tamil.length / letters.length > 0.3;
};

/** Splits lines (and "English / Tamil" halves) by script into { en, ta }. */
function toBilingual(lines: string[]): Bilingual {
  const en: string[] = [];
  const ta: string[] = [];
  for (const line of lines) {
    const halves = line.split(/\s+\/\s+/);
    const parts =
      halves.length === 2 && isTamil(halves[0]) !== isTamil(halves[1]) ? halves : [line];
    for (const p of parts) (isTamil(p) ? ta : en).push(p.trim());
  }
  const e = en.filter(Boolean).join(" ");
  const t = ta.filter(Boolean).join(" ");
  return e && t ? { en: e, ta: t } : t ? { ta: t } : e;
}

const englishOf = (b: Bilingual) => (typeof b === "string" ? b : (b.en ?? "")).toLowerCase();
const tamilOf = (b: Bilingual) => (typeof b === "string" ? "" : (b.ta ?? ""));

function normalizeAnswer(raw: string) {
  const a = raw.trim();
  if (TAMIL_LETTERS[a]) return TAMIL_LETTERS[a];
  if (/^[a-d]$/i.test(a)) return a.toUpperCase();
  if (/^(true|சரி)$/i.test(a)) return "True";
  if (/^(false|தவறு)$/i.test(a)) return "False";
  return a;
}

type Draft = { num: number; lines: string[]; options: { id: string; lines: string[] }[]; answer?: string };

/** Splits a line at option markers; text before the first marker is returned as `lead`. */
function splitOptions(line: string) {
  const marks = [...line.matchAll(OPTION_MARKER)];
  if (marks.length === 0) return { lead: line, options: [] as { id: string; text: string }[] };
  const options = marks.map((m, i) => {
    const letter = m[1] ?? m[2] ?? m[3];
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index! : line.length;
    return { id: normalizeAnswer(letter), text: line.slice(start, end).trim() };
  });
  return { lead: line.slice(0, marks[0].index!).trim(), options };
}

export function parseQuestionText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const drafts: Draft[] = [];
  const key = new Map<number, string>();
  let current: Draft | null = null;
  let inKey = false;

  for (const line of lines) {
    if (ANSWER_KEY_HEADING.test(line)) {
      inKey = true;
      continue;
    }
    if (inKey) {
      for (const m of line.matchAll(KEY_PAIR)) key.set(Number(m[1]), normalizeAnswer(m[2]));
      continue;
    }

    const answer = line.match(ANSWER_LINE);
    if (answer && current) {
      current.answer = normalizeAnswer(answer[1]);
      continue;
    }

    const start = line.match(QUESTION_START);
    // A new number only starts a question when it isn't mid-option text like "2) 45".
    if (start && (!current || current.options.length > 0 || Number(start[1]) === current.num + 1)) {
      current = { num: Number(start[1]), lines: [], options: [] };
      drafts.push(current);
      const { lead, options } = splitOptions(start[2]);
      if (lead) current.lines.push(lead);
      for (const o of options) current.options.push({ id: o.id, lines: [o.text] });
      continue;
    }
    if (!current) continue; // Headers and instructions before question 1.

    const { lead, options } = splitOptions(line);
    if (lead) {
      const last = current.options.at(-1);
      (last ? last.lines : current.lines).push(lead);
    }
    for (const o of options) {
      // Bilingual papers repeat options: "(A) Chennai" then "(A) சென்னை".
      const existing = current.options.find((x) => x.id === o.id);
      if (existing) existing.lines.push(o.text);
      else current.options.push({ id: o.id, lines: [o.text] });
    }
  }

  const warnings: string[] = [];
  const questions = drafts.map((d, i): ParsedQuestion => {
    const n = i + 1;
    const question = toBilingual(d.lines);
    const options = d.options.map((o) => ({ id: o.id, text: toBilingual(o.lines) }));
    const answer = d.answer ?? key.get(d.num) ?? "";

    if (!englishOf(question) && !tamilOf(question)) warnings.push(`Question ${n} — no question text found`);
    if (!answer) warnings.push(`Question ${n} — no answer found, fill in correctAnswer`);

    const isTrueFalse =
      options.length === 2 &&
      /^(true|சரி)$/i.test(englishOf(options[0].text) || tamilOf(options[0].text)) &&
      /^(false|தவறு)$/i.test(englishOf(options[1].text) || tamilOf(options[1].text));
    if (isTrueFalse || (options.length === 0 && /^(True|False)$/.test(answer))) {
      const id = answer === "True" ? "A" : answer === "False" ? "B" : answer;
      return { type: "true_false", question, correctAnswer: id };
    }
    if (options.length === 0 && /^-?\d+$/.test(answer)) {
      return { type: "integer", question, correctAnswer: Number(answer) };
    }
    if (options.length < 2) warnings.push(`Question ${n} — fewer than 2 options found`);
    return { type: "mcq_single", question, options, correctAnswer: answer };
  });

  return { questions, warnings };
}
