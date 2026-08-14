/**
 * localStorage wrapper. Identical in the three litpipe apps.
 *
 * Every read is defensive: localStorage can throw (Safari private mode, quota,
 * disabled storage) and can contain JSON written by an older version of the app.
 * A tool that loses the user's work on a parse error is worse than one that
 * starts empty, so a bad read degrades to the fallback and never propagates.
 */

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} False when the write failed (quota, disabled storage).
 */
export function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
