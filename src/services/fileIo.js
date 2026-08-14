/**
 * Reading files the user picked and writing files the user downloads.
 * Identical in the three litpipe apps.
 */

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });
}

/**
 * Triggers a download of `content` without a server.
 *
 * The object URL is revoked afterwards; without that, the blob is retained for
 * the lifetime of the page, which matters when the user exports repeatedly.
 *
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType]
 */
export function downloadText(filename, content, mimeType = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {string} filename
 * @param {unknown} value
 */
export function downloadJson(filename, value) {
  downloadText(filename, JSON.stringify(value, null, 2), 'application/json');
}

/**
 * Escapes one CSV cell: quotes it when it contains a comma, quote or newline,
 * and doubles any embedded quote — the same rule csv.js reads back.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {string[]} header
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
