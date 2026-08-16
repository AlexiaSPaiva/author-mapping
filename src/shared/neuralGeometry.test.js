import { describe, expect, it } from 'vitest';

import { axonPath, backgroundFibres, dendrites, seededRandom } from './neuralGeometry.js';

describe('seededRandom', () => {
  it('repeats exactly for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays inside [0, 1)', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 200; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('backgroundFibres', () => {
  const options = { width: 1200, height: 220, count: 12, seed: 7 };

  it('draws the requested number of fibres, all as paths', () => {
    const fibres = backgroundFibres(options);
    expect(fibres).toHaveLength(12);
    expect(fibres.every((fibre) => fibre.d.startsWith('M'))).toBe(true);
  });

  it('is stable across calls, so a re-render does not reshuffle the network', () => {
    expect(backgroundFibres(options)).toEqual(backgroundFibres(options));
  });

  it('keeps every fibre faint enough to stay in the background', () => {
    expect(backgroundFibres(options).every((fibre) => fibre.opacity <= 0.3)).toBe(true);
  });
});

describe('dendrites', () => {
  const options = { cx: 260, cy: 110, count: 9, seed: 3 };

  it('emits a branch and a fork for each dendrite', () => {
    expect(dendrites(options)).toHaveLength(18);
  });

  it('starts every main branch at the soma', () => {
    const branches = dendrites(options).filter((_, index) => index % 2 === 0);
    expect(branches.every((branch) => branch.d.startsWith('M260 110'))).toBe(true);
  });

  it('is stable across calls', () => {
    expect(dendrites(options)).toEqual(dendrites(options));
  });
});

describe('axonPath', () => {
  it('runs from the given start to the given end', () => {
    const d = axonPath({ fromX: 100, toX: 300, y: 110 });
    expect(d.startsWith('M100 110')).toBe(true);
    expect(d.endsWith('300 110')).toBe(true);
  });
});
