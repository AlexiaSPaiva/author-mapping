/**
 * Turning a list of OpenAlex works into a picture of who works on a topic.
 *
 * Pure functions over already-fetched data: no network calls here, which is why
 * all of it is directly testable without mocking anything.
 *
 * ── What "relevance" means in this file ────────────────────────────────────
 * Every ranking below is *bibliometric*: how many papers an author has in the
 * result set, how often those papers are cited, who they publish with, and when
 * they were active. None of it measures the quality of anyone's science.
 *
 * Citation and volume metrics carry documented biases — towards English-language
 * work, towards authors from wealthy countries and well-funded institutions,
 * towards long careers over early-career researchers, and towards fields with
 * dense citation habits. A researcher doing excellent work in Portuguese on a
 * small budget will rank below a prolific author in a large consortium, and that
 * is a property of the metric, not a finding about them.
 *
 * This is stated in the app's interface as well as here.
 */

/**
 * Co-authorship edges are skipped for works with more author slots than this.
 *
 * A 400-author consortium paper would contribute ~80,000 pairs and would connect
 * everyone to everyone, drowning the actual collaboration structure in a single
 * clique. Excluding those from the graph is a deliberate choice, surfaced in the
 * UI as a count of skipped works rather than applied silently.
 */
export const MAX_AUTHORS_FOR_COAUTHORSHIP = 25;

/**
 * @typedef {object} Work
 * @property {string} id
 * @property {string} title
 * @property {number|null} year
 * @property {number} citedByCount
 * @property {{ id: string, name: string, orcid: string|null, institution: string, country: string }[]} authorships
 */

/**
 * @typedef {object} AuthorSummary
 * @property {string} id
 * @property {string} name
 * @property {string|null} orcid
 * @property {number} worksCount     Works by this author *in this result set*.
 * @property {number} citationsTotal Citations of those works, summed.
 * @property {string} institution    Most frequent affiliation in this set.
 * @property {string} country        Most frequent country code in this set.
 * @property {number|null} firstYear
 * @property {number|null} lastYear
 * @property {string[]} workIds
 */

/** The most frequent value in a list, ties broken alphabetically for stability. */
export function mostFrequent(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (counts.size === 0) return '';
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

/**
 * Aggregates works into one summary per author.
 *
 * Authors are keyed by OpenAlex author id, not by name: two different people
 * genuinely share a name often enough that name-keying would merge them, and the
 * same person's name is spelled inconsistently across publishers.
 *
 * @param {Work[]} works
 * @returns {AuthorSummary[]} Descending by works count, then citations, then name.
 */
export function summariseAuthors(works) {
  /** @type {Map<string, { author: object, works: Work[], institutions: string[], countries: string[] }>} */
  const byAuthor = new Map();

  for (const work of works) {
    for (const authorship of work.authorships ?? []) {
      if (!authorship.id) continue;
      let entry = byAuthor.get(authorship.id);
      if (!entry) {
        entry = { author: authorship, works: [], institutions: [], countries: [] };
        byAuthor.set(authorship.id, entry);
      }
      entry.works.push(work);
      entry.institutions.push(authorship.institution);
      entry.countries.push(authorship.country);
    }
  }

  return [...byAuthor.values()]
    .map(({ author, works: authorWorks, institutions, countries }) => {
      const years = authorWorks.map((w) => w.year).filter((y) => Number.isFinite(y));
      return {
        id: author.id,
        name: author.name,
        orcid: author.orcid ?? null,
        worksCount: authorWorks.length,
        citationsTotal: authorWorks.reduce((sum, w) => sum + (w.citedByCount ?? 0), 0),
        institution: mostFrequent(institutions),
        country: mostFrequent(countries),
        firstYear: years.length > 0 ? Math.min(...years) : null,
        lastYear: years.length > 0 ? Math.max(...years) : null,
        workIds: authorWorks.map((w) => w.id),
      };
    })
    .sort(
      (a, b) =>
        b.worksCount - a.worksCount ||
        b.citationsTotal - a.citationsTotal ||
        a.name.localeCompare(b.name),
    );
}

/**
 * Co-authorship edges, weighted by how many works two authors share.
 *
 * Pair keys are built from sorted ids so the edge A–B and the edge B–A are one
 * edge, not two.
 *
 * @param {Work[]} works
 * @param {Set<string>} [restrictTo] Only edges between these author ids.
 * @returns {{ edges: { source: string, target: string, weight: number }[], skippedWorks: number }}
 */
export function coauthorshipEdges(works, restrictTo = null) {
  const weights = new Map();
  let skippedWorks = 0;

  for (const work of works) {
    const ids = (work.authorships ?? [])
      .map((a) => a.id)
      .filter((id) => id && (!restrictTo || restrictTo.has(id)));

    if (ids.length > MAX_AUTHORS_FOR_COAUTHORSHIP) {
      skippedWorks += 1;
      continue;
    }

    const unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const [source, target] = [unique[i], unique[j]].sort();
        const key = `${source}|${target}`;
        weights.set(key, (weights.get(key) ?? 0) + 1);
      }
    }
  }

  const edges = [...weights.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split('|');
      return { source, target, weight };
    })
    // Heaviest first, then by id, so the render order is deterministic.
    .sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source));

  return { edges, skippedWorks };
}

/** Publication-volume bands, used by the "volume" grouping. */
export function volumeBand(worksCount) {
  if (worksCount >= 10) return '10+ works in this topic';
  if (worksCount >= 5) return '5–9 works';
  if (worksCount >= 2) return '2–4 works';
  return '1 work';
}

/**
 * Activity band from the most recent publication year in the result set.
 *
 * `referenceYear` is a parameter rather than read from the clock, so the grouping
 * is deterministic and testable.
 */
export function activityBand(author, referenceYear) {
  if (!author.lastYear) return 'Year unknown';
  const age = referenceYear - author.lastYear;
  if (age <= 2) return 'Active (last 2 years)';
  if (age <= 5) return 'Recent (3–5 years ago)';
  if (age <= 10) return 'Older (6–10 years ago)';
  return 'Historic (10+ years ago)';
}

/** The grouping criteria offered in the UI. Visible and configurable, as asked. */
export const GROUPINGS = {
  volume: {
    label: 'Publication volume in this topic',
    key: (author) => volumeBand(author.worksCount),
  },
  institution: { label: 'Institution', key: (author) => author.institution || 'Not reported' },
  country: { label: 'Country', key: (author) => author.country || 'Not reported' },
  activity: { label: 'Period of activity', key: (author, year) => activityBand(author, year) },
};

/**
 * Buckets authors by one criterion.
 *
 * @param {AuthorSummary[]} authors
 * @param {keyof typeof GROUPINGS} criterion
 * @param {number} referenceYear
 * @returns {{ label: string, authors: AuthorSummary[] }[]} Largest group first.
 */
export function groupAuthors(authors, criterion, referenceYear) {
  const grouping = GROUPINGS[criterion];
  if (!grouping) return [{ label: 'All authors', authors }];

  const buckets = new Map();
  for (const author of authors) {
    const label = grouping.key(author, referenceYear);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(author);
  }

  return [...buckets.entries()]
    .map(([label, members]) => ({ label, authors: members }))
    .sort((a, b) => b.authors.length - a.authors.length || a.label.localeCompare(b.label));
}

/**
 * @param {AuthorSummary[]} authors
 * @param {{ minWorks?: number, activeSince?: number|null, query?: string }} filters
 * @returns {AuthorSummary[]}
 */
export function filterAuthors(authors, filters = {}) {
  const { minWorks = 1, activeSince = null, query = '' } = filters;
  const needle = query.trim().toLowerCase();

  return authors.filter((author) => {
    if (author.worksCount < minWorks) return false;
    if (activeSince && (!author.lastYear || author.lastYear < activeSince)) return false;
    if (needle) {
      const haystack = `${author.name} ${author.institution} ${author.country}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/**
 * Recurring collaborators of one author, strongest tie first.
 *
 * @param {string} authorId
 * @param {{ source: string, target: string, weight: number }[]} edges
 * @param {AuthorSummary[]} authors
 * @param {number} [minWeight] Two shared works is the default threshold for
 *   "recurring" — a single shared paper is a coincidence more often than a
 *   collaboration.
 */
export function recurringCoauthors(authorId, edges, authors, minWeight = 2) {
  const namesById = new Map(authors.map((author) => [author.id, author.name]));

  return edges
    .filter(
      (edge) => edge.weight >= minWeight && (edge.source === authorId || edge.target === authorId),
    )
    .map((edge) => ({
      id: edge.source === authorId ? edge.target : edge.source,
      weight: edge.weight,
    }))
    .filter((coauthor) => namesById.has(coauthor.id))
    .map((coauthor) => ({ ...coauthor, name: namesById.get(coauthor.id) }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}
