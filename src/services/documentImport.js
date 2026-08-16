/**
 * Reading the two document formats a researcher actually has on disk: a PDF of
 * the paper, or a plain-text note. Identical file in the three litpipe apps.
 *
 * The PDF reader (pdfjs) is loaded on demand — it is by far the heaviest
 * dependency here, and most sessions never import a PDF at all.
 */
import { IMPORT_LIMITS, safeString } from './importLimits.js';
import { readTextFile } from './fileIo.js';

/** What a file has to end in to be offered in the picker. */
export const DOCUMENT_ACCEPT = '.pdf,.txt,application/pdf,text/plain';

/** Pages beyond this are ignored: a thesis is not an abstract, and the tab must stay responsive. */
export const MAX_PDF_PAGES = 40;

/** @param {File} file */
export function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** @param {File} file */
export function isPlainText(file) {
  return /\.txt$/i.test(file.name) || file.type === 'text/plain';
}

/** @param {File} file */
export function isDocument(file) {
  return isPdf(file) || isPlainText(file);
}

/**
 * PDF text comes out as positioned fragments, not sentences: a line break in
 * the layout is not a line break in the prose, and a word split across two
 * lines keeps its hyphen. Both are repaired here, once, so every caller sees
 * ordinary running text.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normaliseDocumentText(raw) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/-\n(?=\p{Ll})/gu, '') // word split across a line break
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The title of a document, as far as a file can tell us: the first line that
 * reads like one. Falls back to the file name, which is never wrong, only
 * unhelpful — the user can edit it afterwards either way.
 *
 * @param {string} fileName
 * @param {string} text
 * @returns {string}
 */
export function guessTitle(fileName, text) {
  const candidate = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 300 && /\p{L}/u.test(line));

  const fallback = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  return safeString(candidate ?? fallback, IMPORT_LIMITS.titleChars) || 'Untitled document';
}

/**
 * Builds the article shape the three apps share out of an extracted document.
 *
 * @param {string} fileName
 * @param {string} text
 * @returns {{ id: string, title: string, abstract: string, authors: string[], year: null, doi: string, source: string }}
 */
export function articleFromDocument(fileName, text) {
  const clean = normaliseDocumentText(text);
  const title = guessTitle(fileName, clean);
  return {
    // Same file imported twice is the same article: the id is derived from the
    // content, so de-duplication upstream catches it without a second copy.
    id: `doc-${title.slice(0, 60)}-${clean.length}`,
    title,
    abstract: safeString(clean, IMPORT_LIMITS.abstractChars),
    authors: [],
    year: null,
    doi: '',
    source: fileName,
  };
}

/**
 * Extracts the text of one PDF or .txt file.
 *
 * @param {File} file
 * @returns {Promise<string>}
 * @throws {Error} with a message meant for the user
 */
export async function extractText(file) {
  if (isPlainText(file)) return normaliseDocumentText(await readTextFile(file));
  if (!isPdf(file)) throw new Error(`${file.name} is not a PDF or a .txt file.`);

  const pdfjs = await import('pdfjs-dist');
  // Vite resolves this URL at build time and emits the worker as an asset.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  let document;
  try {
    document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch {
    throw new Error(`${file.name} could not be opened. Is it a valid, unencrypted PDF?`);
  }

  try {
    const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);
    const pages = [];
    for (let number = 1; number <= pageCount; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str ?? '').join(' '));
      page.cleanup();
    }
    return normaliseDocumentText(pages.join('\n\n'));
  } finally {
    // Without this the worker and the whole file stay in memory for the session.
    await document.destroy();
  }
}

/**
 * Reads every picked document, keeping the failures instead of throwing them:
 * one unreadable PDF in a batch of ten should not lose the other nine.
 *
 * @param {File[]} files
 * @returns {Promise<{ articles: object[], errors: string[] }>}
 */
export async function importDocuments(files) {
  const articles = [];
  const errors = [];

  for (const file of files) {
    try {
      const text = await extractText(file);
      if (!text) {
        errors.push(`${file.name}: no text found. A scanned PDF needs OCR first.`);
        continue;
      }
      articles.push(articleFromDocument(file.name, text));
    } catch (error) {
      errors.push(error.message);
    }
  }

  return { articles, errors };
}
