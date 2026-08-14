import { describe, it, expect } from 'vitest';
import { MAX_PER_PAGE, buildWorksUrl, normaliseWork } from './openalex.js';

/** Only the pure parts are unit-tested; the network call is exercised by hand. */

describe('buildWorksUrl', () => {
  it('sends the query as a search parameter', () => {
    const url = new URL(buildWorksUrl('vascular dementia'));
    expect(url.searchParams.get('search')).toBe('vascular dementia');
    expect(url.origin + url.pathname).toBe('https://api.openalex.org/works');
  });

  it('requests only the fields the app uses', () => {
    const select = new URL(buildWorksUrl('x')).searchParams.get('select');
    expect(select).toContain('authorships');
    expect(select).toContain('cited_by_count');
    expect(select).not.toContain('abstract_inverted_index');
  });

  it('caps per_page at the API maximum', () => {
    const url = new URL(buildWorksUrl('x', { perPage: 5000 }));
    expect(url.searchParams.get('per_page')).toBe(String(MAX_PER_PAGE));
  });

  it('never requests fewer than one result', () => {
    expect(new URL(buildWorksUrl('x', { perPage: 0 })).searchParams.get('per_page')).toBe('1');
  });

  it('adds a year filter when asked', () => {
    const url = new URL(buildWorksUrl('x', { fromYear: 2015 }));
    expect(url.searchParams.get('filter')).toBe('from_publication_date:2015-01-01');
  });

  it('omits the filter parameter entirely when no year is given', () => {
    expect(new URL(buildWorksUrl('x')).searchParams.has('filter')).toBe(false);
  });

  it('adds mailto only when one is configured', () => {
    expect(new URL(buildWorksUrl('x')).searchParams.has('mailto')).toBe(false);
    expect(new URL(buildWorksUrl('x', { mailto: 'a@b.org' })).searchParams.get('mailto')).toBe(
      'a@b.org',
    );
  });

  it('trims the query', () => {
    expect(new URL(buildWorksUrl('  dementia  ')).searchParams.get('search')).toBe('dementia');
  });
});

describe('normaliseWork', () => {
  // Shape taken from a real api.openalex.org/works response.
  const raw = {
    id: 'https://openalex.org/W2527609605',
    display_name: 'Vascular Contributions to Cognitive Impairment and Dementia',
    publication_year: 2011,
    cited_by_count: 3810,
    authorships: [
      {
        author: {
          id: 'https://openalex.org/A5019914929',
          display_name: 'Philip B. Gorelick',
          orcid: 'https://orcid.org/0000-0002-1181-614X',
        },
        institutions: [{ display_name: 'American Heart Association', country_code: 'US' }],
        countries: ['US'],
      },
    ],
  };

  it('flattens a work into the shape the domain layer expects', () => {
    const work = normaliseWork(raw);
    expect(work.id).toBe('https://openalex.org/W2527609605');
    expect(work.year).toBe(2011);
    expect(work.citedByCount).toBe(3810);
    expect(work.authorships[0]).toEqual({
      id: 'https://openalex.org/A5019914929',
      name: 'Philip B. Gorelick',
      orcid: 'https://orcid.org/0000-0002-1181-614X',
      institution: 'American Heart Association',
      country: 'US',
    });
  });

  it('drops authorships with no author id, since they cannot be grouped', () => {
    const anonymous = { ...raw, authorships: [{ author: {} }, raw.authorships[0]] };
    expect(normaliseWork(anonymous).authorships).toHaveLength(1);
  });

  it('defaults a missing year to null rather than NaN', () => {
    expect(normaliseWork({ ...raw, publication_year: null }).year).toBeNull();
  });

  it('defaults a missing citation count to zero', () => {
    expect(normaliseWork({ ...raw, cited_by_count: undefined }).citedByCount).toBe(0);
  });

  it('falls back to the institution country when countries is absent', () => {
    const noCountries = {
      ...raw,
      authorships: [{ ...raw.authorships[0], countries: undefined }],
    };
    expect(normaliseWork(noCountries).authorships[0].country).toBe('US');
  });

  it('tolerates a work with no authorships at all', () => {
    expect(normaliseWork({ id: 'W1' }).authorships).toEqual([]);
  });

  it('labels a missing title rather than producing undefined', () => {
    expect(normaliseWork({ id: 'W1' }).title).toBe('Untitled');
  });
});
