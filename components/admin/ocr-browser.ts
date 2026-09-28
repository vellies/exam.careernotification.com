"use client";

// Plain OCR in the admin's browser — no AI, no API key. Digital PDFs use their
// text layer; scanned pages and photos go through Tesseract (English + Tamil).
// The libraries are loaded on demand so they don't weigh down other pages.

import type { Worker } from "tesseract.js";

/** A page with less text than this is treated as scanned and OCR'd. */
const MIN_TEXT_CHARS = 20;

export type OcrProgress = (message: string) => void;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

async function pdfToText(
  file: File,
  ocr: () => Promise<Worker>,
  forceOcr: boolean,
  progress: OcrProgress,
) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const pages: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      let text = "";
      if (!forceOcr) {
        const content = await page.getTextContent();
        text = content.items
          .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
          .join("");
      }
      if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
        progress(`${file.name}: reading page ${n} of ${doc.numPages} (OCR)…`);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        text = (await (await ocr()).recognize(canvas)).data.text;
      } else {
        progress(`${file.name}: reading page ${n} of ${doc.numPages}…`);
      }
      pages.push(text);
    }
  } finally {
    await task.destroy();
  }
  return pages.join("\n");
}

/** Reads the text of every file, in order. */
export async function readFilesText(
  files: File[],
  options: { forceOcr: boolean; progress: OcrProgress },
) {
  let worker: Worker | null = null;
  const ocr = async () => {
    if (!worker) {
      options.progress("Loading OCR engine (English + Tamil)…");
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker(["eng", "tam"]);
    }
    return worker;
  };

  try {
    const texts: string[] = [];
    for (const [i, file] of files.entries()) {
      if (file.type === "application/pdf") {
        texts.push(await pdfToText(file, ocr, options.forceOcr, options.progress));
      } else {
        options.progress(`Reading image ${i + 1} of ${files.length}…`);
        texts.push((await (await ocr()).recognize(file)).data.text);
      }
    }
    return texts.join("\n");
  } finally {
    await (worker as Worker | null)?.terminate();
  }
}
