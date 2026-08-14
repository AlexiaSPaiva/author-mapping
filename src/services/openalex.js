/**
 * OpenAlex client. The one external integration in the litpipe suite.
 *
 * ── Why OpenAlex and not Crossref or Scopus ────────────────────────────────
 * OpenAlex is free, needs no API key, and — the deciding factor — returns
 * *disambiguated author identifiers*. Crossref returns author names as strings,
 * which means two people called J. Smith merge into one and one person spelled
 * two ways splits into two; author mapping built on names is built on sand.
 * Scopus and Web of Science have the identifiers but require a paid
 * institutional key, which would make this app undemonstrable to anyone without
 * one.
 *
 * ── Being a polite client ──────────────────────────────────────────────────
 * OpenAlex asks callers to identify themselves with a `mailto` parameter, and
 * routes those requests through a faster, more reliable pool. That address is
 * read from `VITE_OPENALEX_MAILTO` rather than hard-coded, so no email address
 * is committed to a public repository. Without it the app still works, on the
 * common pool.
 *
 * Responses are cached in localStorage: rerunning the same search — which happens
 * constantly while adjusting filters — costs zero requests. Rate limiting (HTTP
 * 429) and outages are reported to the user in plain language instead of failing
 * silently or retrying in a loop.
 *
 * API docs: https://docs.openalex.org/api-entities/works
 */

import { loadJson, saveJson } from './storage.js';

const API_ROOT = 'https://api.openalex.org/works';
const CACHE_KEY = 'litpipe.author-mapping.cache.v1';

/** Cached responses older than this are refetched. A week is far shorter than
 *  the rate at which a field's author list changes. */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** OpenAlex allows up to 200 results per page. */
export const MAX_PER_PAGE = 200;

/** Only these fields are requested; a full work record is ~10x larger. */
const SELECT_FIELDS = ['id', 'display_name', 'publication_year', 'cited_by_count', 'authorships'];

/**
 * Builds the request URL.
 *
 * Exported so the exact request can be inspected — and shown in the UI, which
 * matters for a tool whose output depends entirely on what was asked for.
 *
 * @param {string} query Free-text search, normally the research profile.
 * @param {{ perPage?: number, fromYear?: number|null, mailto?: string }} [options]
 * @returns {string}
 */
export function buildWorksUrl(query, options = {}) {
  const { perPage = MAX_PER_PAGE, fromYear = null, mailto = '' } = options;

  const params = new URLSearchParams({
    search: query.trim(),
    per_page: String(Math.min(Math.max(1, perPage), MAX_PER_PAGE)),
    select: SELECT_FIELDS.join(','),
  });

  if (fromYear) params.set('filter', `from_publication_date:${fromYear}-01-01`);
  if (mailto) params.set('mailto', mailto);

  return `${API_ROOT}?${params.toString()}`;
}

/**
 * Flattens an OpenAlex work into the shape `domain/grouping.js` consumes.
 *
 * An author can be listed with several affiliations on one paper; the first is
 * taken, because the grouping needs one value per authorship and the first
 * listed is conventionally the primary one.
 *
 * @param {Record<string, unknown>} raw
 * @returns {import('../domain/grouping.js').Work}
 */
export function normaliseWork(raw) {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.display_name ?? 'Untitled'),
    year: Number.isFinite(raw.publication_year) ? raw.publication_year : null,
    citedByCount: Number.isFinite(raw.cited_by_count) ? raw.cited_by_count : 0,
    authorships: (Array.isArray(raw.authorships) ? raw.authorships : [])
      .map((authorship) => ({
        id: String(authorship?.author?.id ?? ''),
        name: String(authorship?.author?.display_name ?? 'Unknown author'),
        orcid: authorship?.author?.orcid ?? null,
        institution: String(authorship?.institutions?.[0]?.display_name ?? ''),
        country: String(
          authorship?.countries?.[0] ?? authorship?.institutions?.[0]?.country_code ?? '',
        ),
      }))
      .filter((authorship) => authorship.id),
  };
}

/** Reads the cache, dropping entries past their TTL. */
function readCache(url, now) {
  const cache = loadJson(CACHE_KEY, {});
  const entry = cache[url];
  if (!entry || now - entry.storedAt > CACHE_TTL_MS) return null;
  return entry;
}

function writeCache(url, payload, now) {
  const cache = loadJson(CACHE_KEY, {});
  // Keep the cache bounded: 20 searches is generous and stays well inside the
  // ~5 MB localStorage budget shared with the app's own state.
  const entries = Object.entries(cache)
    .sort((a, b) => b[1].storedAt - a[1].storedAt)
    .slice(0, 19);
  saveJson(CACHE_KEY, { ...Object.fromEntries(entries), [url]: { ...payload, storedAt: now } });
}

export function clearCache() {
  saveJson(CACHE_KEY, {});
}

/**
 * Fetches works for a query.
 *
 * Never throws for an expected failure: it returns an `error` string written for
 * the person using the app. A search tool that shows a stack trace, or nothing
 * at all, is worse than one that says which of the four things went wrong.
 *
 * @param {string} query
 * @param {{
 *   perPage?: number,
 *   fromYear?: number|null,
 *   mailto?: string,
 *   signal?: AbortSignal,
 *   now?: number,
 * }} [options]
 * @returns {Promise<{
 *   works: import('../domain/grouping.js').Work[],
 *   totalAvailable: number,
 *   url: string,
 *   fromCache: boolean,
 *   error: string | null,
 * }>}
 */
export async function fetchWorks(query, options = {}) {
  const { signal, now = Date.now(), ...urlOptions } = options;
  const trimmed = query.trim();
  const empty = { works: [], totalAvailable: 0, fromCache: false };

  if (trimmed.length < 3) {
    return { ...empty, url: '', error: 'Type at least three characters to search.' };
  }

  const url = buildWorksUrl(trimmed, urlOptions);

  const cached = readCache(url, now);
  if (cached) {
    return {
      works: cached.works,
      totalAvailable: cached.totalAvailable,
      url,
      fromCache: true,
      error: null,
    };
  }

  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return {
      ...empty,
      url,
      error: 'Could not reach OpenAlex. Check your connection and try again.',
    };
  }

  if (response.status === 429) {
    return {
      ...empty,
      url,
      error:
        'OpenAlex is rate-limiting this client. Wait a minute before searching again — ' +
        'previous searches are still available from the local cache.',
    };
  }

  if (!response.ok) {
    return {
      ...empty,
      url,
      error: `OpenAlex returned HTTP ${response.status}. The query may be malformed, or the service may be down.`,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return { ...empty, url, error: 'OpenAlex returned a response that could not be read as JSON.' };
  }

  const works = (Array.isArray(payload.results) ? payload.results : []).map(normaliseWork);
  const totalAvailable = Number.isFinite(payload?.meta?.count) ? payload.meta.count : works.length;

  writeCache(url, { works, totalAvailable }, now);

  return { works, totalAvailable, url, fromCache: false, error: null };
}
