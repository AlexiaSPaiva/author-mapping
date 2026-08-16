/**
 * Caps applied to every imported file. A .bib or .csv the user picked is
 * untrusted input: it can be enormous by accident (a whole Zotero library) or
 * malformed on purpose. Nothing here prevents a security breach in the classic
 * sense — there is no server and no eval — but an unbounded parse freezes the
 * browser tab, which is a real failure the user experiences as a crash.
 */

export const IMPORT_LIMITS = {
  /** 5 MB of BibTeX is roughly 10k entries; well past any realistic screening set. */
  fileBytes: 5 * 1024 * 1024,
  maxEntries: 5000,
  titleChars: 1000,
  abstractChars: 20000,
  maxAuthors: 100,
};

/**
 * Trims a value to a string of at most `max` characters.
 * @param {unknown} value
 * @param {number} max
 * @returns {string}
 */
export function safeString(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * @param {File} file
 * @returns {string[]} Human-readable reasons the file was rejected; empty if fine.
 */
export function checkFile(file) {
  const errors = [];
  if (file.size === 0) errors.push('File is empty.');
  if (file.size > IMPORT_LIMITS.fileBytes) {
    const mb = (IMPORT_LIMITS.fileBytes / 1024 / 1024).toFixed(0);
    errors.push(`File is larger than ${mb} MB. Split the export into smaller batches.`);
  }
  return errors;
}
