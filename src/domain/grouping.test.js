import { describe, it, expect } from 'vitest';
import {
  MAX_AUTHORS_FOR_COAUTHORSHIP,
  activityBand,
  coauthorshipEdges,
  filterAuthors,
  groupAuthors,
  mostFrequent,
  recurringCoauthors,
  summariseAuthors,
  volumeBand,
} from './grouping.js';

/** Builds an authorship entry in the normalised shape the app uses internally. */
const person = (id, name, institution = 'UFF', country = 'BR') => ({
  id,
  name,
  orcid: null,
  institution,
  country,
});

const work = (id, year, citedByCount, authorships) => ({
  id,
  title: `Work ${id}`,
  year,
  citedByCount,
  authorships,
});

const ana = person('A1', 'Ana Silva');
const bruno = person('A2', 'Bruno Costa', 'Mackenzie', 'BR');
const clara = person('A3', 'Clara Nolan', 'UCL', 'GB');

describe('mostFrequent', () => {
  it('returns the most common value', () => {
    expect(mostFrequent(['UFF', 'UCL', 'UFF'])).toBe('UFF');
  });

  it('breaks ties alphabetically so the result is stable', () => {
    expect(mostFrequent(['UCL', 'UFF'])).toBe('UCL');
  });

  it('ignores empty values and returns empty for no input', () => {
    expect(mostFrequent(['', null, 'UFF'])).toBe('UFF');
    expect(mostFrequent([])).toBe('');
  });
});

describe('summariseAuthors', () => {
  const works = [
    work('W1', 2020, 10, [ana, bruno]),
    work('W2', 2023, 5, [ana, clara]),
    work('W3', 2024, 1, [ana]),
  ];

  it('counts works per author', () => {
    const summaries = summariseAuthors(works);
    expect(summaries[0].name).toBe('Ana Silva');
    expect(summaries[0].worksCount).toBe(3);
  });

  it("sums citations across an author's works in the set", () => {
    expect(summariseAuthors(works)[0].citationsTotal).toBe(16);
  });

  it('reports the first and last year seen', () => {
    const ranked = summariseAuthors(works);
    expect(ranked[0].firstYear).toBe(2020);
    expect(ranked[0].lastYear).toBe(2024);
  });

  it('ranks by works count, then citations', () => {
    // Bruno: 1 work / 10 citations. Clara: 1 work / 5 citations.
    const names = summariseAuthors(works).map((a) => a.name);
    expect(names).toEqual(['Ana Silva', 'Bruno Costa', 'Clara Nolan']);
  });

  it('keys authors by id, not by name, so namesakes are not merged', () => {
    const namesakes = [work('W1', 2020, 0, [person('A1', 'J. Smith'), person('A9', 'J. Smith')])];
    expect(summariseAuthors(namesakes)).toHaveLength(2);
  });

  it('picks the most frequent affiliation when it varies', () => {
    const moved = [
      work('W1', 2018, 0, [person('A1', 'Ana Silva', 'UFF')]),
      work('W2', 2020, 0, [person('A1', 'Ana Silva', 'UCL')]),
      work('W3', 2022, 0, [person('A1', 'Ana Silva', 'UCL')]),
    ];
    expect(summariseAuthors(moved)[0].institution).toBe('UCL');
  });

  it('handles a work with no authorships and an author with no year', () => {
    const messy = [work('W1', null, 0, []), work('W2', null, 0, [ana])];
    const summaries = summariseAuthors(messy);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].firstYear).toBeNull();
  });

  it('returns an empty list for no works', () => {
    expect(summariseAuthors([])).toEqual([]);
  });
});

describe('coauthorshipEdges', () => {
  it('weights an edge by the number of shared works', () => {
    const works = [work('W1', 2020, 0, [ana, bruno]), work('W2', 2021, 0, [ana, bruno])];
    const { edges } = coauthorshipEdges(works);
    expect(edges).toEqual([{ source: 'A1', target: 'A2', weight: 2 }]);
  });

  it('treats A–B and B–A as one edge', () => {
    const works = [work('W1', 2020, 0, [ana, bruno]), work('W2', 2021, 0, [bruno, ana])];
    expect(coauthorshipEdges(works).edges).toHaveLength(1);
  });

  it('creates every pair in a three-author work', () => {
    const { edges } = coauthorshipEdges([work('W1', 2020, 0, [ana, bruno, clara])]);
    expect(edges).toHaveLength(3);
  });

  it('creates no edge for a single-author work', () => {
    expect(coauthorshipEdges([work('W1', 2020, 0, [ana])]).edges).toEqual([]);
  });

  it('skips consortium works above the author-count guard and reports the count', () => {
    const crowd = Array.from({ length: MAX_AUTHORS_FOR_COAUTHORSHIP + 1 }, (_u, i) =>
      person(`A${i}`, `Author ${i}`),
    );
    const { edges, skippedWorks } = coauthorshipEdges([work('W1', 2020, 0, crowd)]);
    expect(edges).toEqual([]);
    expect(skippedWorks).toBe(1);
  });

  it('restricts edges to a given set of authors', () => {
    const works = [work('W1', 2020, 0, [ana, bruno, clara])];
    const { edges } = coauthorshipEdges(works, new Set(['A1', 'A2']));
    expect(edges).toEqual([{ source: 'A1', target: 'A2', weight: 1 }]);
  });

  it('does not create a self-edge when an author is listed twice on one work', () => {
    const { edges } = coauthorshipEdges([work('W1', 2020, 0, [ana, ana])]);
    expect(edges).toEqual([]);
  });

  it('sorts heaviest edge first', () => {
    const works = [
      work('W1', 2020, 0, [ana, bruno]),
      work('W2', 2021, 0, [ana, bruno]),
      work('W3', 2021, 0, [ana, clara]),
    ];
    expect(coauthorshipEdges(works).edges[0].weight).toBe(2);
  });
});

describe('volumeBand', () => {
  it('bands by works count', () => {
    expect(volumeBand(1)).toBe('1 work');
    expect(volumeBand(3)).toBe('2–4 works');
    expect(volumeBand(7)).toBe('5–9 works');
    expect(volumeBand(25)).toBe('10+ works in this topic');
  });
});

describe('activityBand', () => {
  it('bands by how recently the author last published in the set', () => {
    expect(activityBand({ lastYear: 2025 }, 2026)).toBe('Active (last 2 years)');
    expect(activityBand({ lastYear: 2022 }, 2026)).toBe('Recent (3–5 years ago)');
    expect(activityBand({ lastYear: 2018 }, 2026)).toBe('Older (6–10 years ago)');
    expect(activityBand({ lastYear: 2005 }, 2026)).toBe('Historic (10+ years ago)');
  });

  it('reports unknown rather than guessing when no year is available', () => {
    expect(activityBand({ lastYear: null }, 2026)).toBe('Year unknown');
  });
});

describe('groupAuthors', () => {
  const authors = [
    { id: 'A1', name: 'Ana', worksCount: 12, institution: 'UFF', country: 'BR', lastYear: 2025 },
    { id: 'A2', name: 'Bruno', worksCount: 3, institution: 'UFF', country: 'BR', lastYear: 2019 },
    { id: 'A3', name: 'Clara', worksCount: 1, institution: 'UCL', country: 'GB', lastYear: 2025 },
  ];

  it('groups by institution, largest group first', () => {
    const groups = groupAuthors(authors, 'institution', 2026);
    expect(groups[0]).toEqual({ label: 'UFF', authors: [authors[0], authors[1]] });
  });

  it('groups by country', () => {
    expect(groupAuthors(authors, 'country', 2026).map((g) => g.label)).toEqual(['BR', 'GB']);
  });

  it('groups by volume band', () => {
    const labels = groupAuthors(authors, 'volume', 2026).map((g) => g.label);
    expect(labels).toContain('10+ works in this topic');
    expect(labels).toContain('1 work');
  });

  it('groups by activity relative to the given reference year', () => {
    const groups = groupAuthors(authors, 'activity', 2026);
    expect(groups[0].label).toBe('Active (last 2 years)');
    expect(groups[0].authors).toHaveLength(2);
  });

  it('falls back to a single group for an unknown criterion', () => {
    expect(groupAuthors(authors, 'nonsense', 2026)).toEqual([{ label: 'All authors', authors }]);
  });

  it('labels a missing institution instead of grouping under an empty string', () => {
    const groups = groupAuthors([{ ...authors[0], institution: '' }], 'institution', 2026);
    expect(groups[0].label).toBe('Not reported');
  });
});

describe('filterAuthors', () => {
  const authors = [
    {
      id: 'A1',
      name: 'Ana Silva',
      worksCount: 12,
      institution: 'UFF',
      country: 'BR',
      lastYear: 2025,
    },
    {
      id: 'A2',
      name: 'Bruno Costa',
      worksCount: 1,
      institution: 'Mackenzie',
      country: 'BR',
      lastYear: 2014,
    },
  ];

  it('filters by minimum works', () => {
    expect(filterAuthors(authors, { minWorks: 2 }).map((a) => a.id)).toEqual(['A1']);
  });

  it('filters by last active year', () => {
    expect(filterAuthors(authors, { activeSince: 2020 }).map((a) => a.id)).toEqual(['A1']);
  });

  it('searches name and institution', () => {
    expect(filterAuthors(authors, { query: 'mackenzie' }).map((a) => a.id)).toEqual(['A2']);
    expect(filterAuthors(authors, { query: 'ana' }).map((a) => a.id)).toEqual(['A1']);
  });

  it('returns everything with no filters', () => {
    expect(filterAuthors(authors)).toHaveLength(2);
  });

  it('excludes an author with no known last year when a year filter is set', () => {
    expect(filterAuthors([{ ...authors[0], lastYear: null }], { activeSince: 2020 })).toEqual([]);
  });
});

describe('recurringCoauthors', () => {
  const authors = [
    { id: 'A1', name: 'Ana Silva' },
    { id: 'A2', name: 'Bruno Costa' },
    { id: 'A3', name: 'Clara Nolan' },
  ];
  const edges = [
    { source: 'A1', target: 'A2', weight: 4 },
    { source: 'A1', target: 'A3', weight: 1 },
  ];

  it('excludes one-off collaborations by default', () => {
    expect(recurringCoauthors('A1', edges, authors)).toEqual([
      { id: 'A2', weight: 4, name: 'Bruno Costa' },
    ]);
  });

  it('includes them when the threshold is lowered', () => {
    expect(recurringCoauthors('A1', edges, authors, 1)).toHaveLength(2);
  });

  it('finds the author on either side of the edge', () => {
    expect(recurringCoauthors('A2', edges, authors)[0].name).toBe('Ana Silva');
  });

  it('returns an empty list for an author with no edges', () => {
    expect(recurringCoauthors('A9', edges, authors)).toEqual([]);
  });
});
