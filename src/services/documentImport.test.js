import { describe, expect, it } from 'vitest';

import {
  articleFromDocument,
  guessTitle,
  isDocument,
  normaliseDocumentText,
} from './documentImport.js';

describe('normaliseDocumentText', () => {
  it('rejoins a word split across a line break', () => {
    expect(normaliseDocumentText('cogni-\ntive deficit')).toBe('cognitive deficit');
  });

  it('keeps a hyphen that is not a line break', () => {
    expect(normaliseDocumentText('follow-up study')).toBe('follow-up study');
  });

  it('does not glue a capitalised new line onto the previous one', () => {
    expect(normaliseDocumentText('Methods-\nResults')).toBe('Methods-\nResults');
  });

  it('collapses runs of spaces and blank lines', () => {
    expect(normaliseDocumentText('a   b\n\n\n\nc')).toBe('a b\n\nc');
  });
});

describe('guessTitle', () => {
  it('takes the first line that reads like a title', () => {
    expect(guessTitle('paper.pdf', 'x\nDementia in the ELSA cohort\nmore')).toBe(
      'Dementia in the ELSA cohort',
    );
  });

  it('falls back to the file name when no line qualifies', () => {
    expect(guessTitle('elsa_cohort_2024.pdf', 'a\nb')).toBe('elsa cohort 2024');
  });

  it('never returns an empty title', () => {
    expect(guessTitle('.pdf', '')).toBe('Untitled document');
  });
});

describe('articleFromDocument', () => {
  it('carries the text into the abstract and records the file it came from', () => {
    const article = articleFromDocument('paper.txt', 'A study of memory decline\nBody text.');
    expect(article.title).toBe('A study of memory decline');
    expect(article.abstract).toContain('Body text.');
    expect(article.source).toBe('paper.txt');
  });

  it('gives the same file the same id twice, so re-importing de-duplicates', () => {
    const first = articleFromDocument('paper.txt', 'A study of memory decline\nBody.');
    const second = articleFromDocument('paper.txt', 'A study of memory decline\nBody.');
    expect(first.id).toBe(second.id);
  });
});

describe('isDocument', () => {
  it('accepts pdf and txt, by extension or by mime type', () => {
    expect(isDocument({ name: 'a.pdf', type: '' })).toBe(true);
    expect(isDocument({ name: 'a', type: 'application/pdf' })).toBe(true);
    expect(isDocument({ name: 'a.txt', type: '' })).toBe(true);
    expect(isDocument({ name: 'a.bib', type: '' })).toBe(false);
  });
});
