import { describe, expect, it } from 'vitest';

import {
  axonCurve,
  backgroundFibres,
  dendriteTree,
  pathFromCurve,
  pointOnCurve,
  ranvierNodes,
  seededRandom,
} from './neuralGeometry.js';

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
  const options = { width: 1200, height: 150, count: 12, seed: 7 };

  it('draws the requested number of fibres, all as paths', () => {
    const fibres = backgroundFibres(options);
    expect(fibres).toHaveLength(12);
    expect(fibres.every((fibre) => fibre.d.startsWith('M'))).toBe(true);
  });

  it('is stable across calls, so a re-render does not reshuffle the network', () => {
    expect(backgroundFibres(options)).toEqual(backgroundFibres(options));
  });

  it('keeps every fibre faint enough to stay context, not decoration', () => {
    expect(backgroundFibres(options).every((fibre) => fibre.opacity <= 0.17)).toBe(true);
  });
});

describe('dendriteTree', () => {
  const options = { cx: 520, cy: 68, primary: 7, orders: 3, seed: 3 };

  it('bifurcates at every order: 7 primaries become 7 + 14 + 28 segments', () => {
    expect(dendriteTree(options)).toHaveLength(49);
  });

  it('starts every primary branch at the soma', () => {
    const primaries = dendriteTree(options).filter((segment) => segment.order === 1);
    expect(primaries).toHaveLength(7);
    expect(primaries.every((segment) => segment.d.startsWith('M520 68'))).toBe(true);
  });

  it('tapers: a higher order is always thinner', () => {
    const segments = dendriteTree(options);
    const widthAt = (order) => segments.find((segment) => segment.order === order).width;
    expect(widthAt(1)).toBeGreaterThan(widthAt(2));
    expect(widthAt(2)).toBeGreaterThan(widthAt(3));
  });

  it('is stable across calls', () => {
    expect(dendriteTree(options)).toEqual(dendriteTree(options));
  });
});

describe('the axon', () => {
  const curve = axonCurve({ fromX: 100, toX: 300, y: 68 });

  it('runs from the given start to the given end', () => {
    expect(pointOnCurve(curve, 0)).toEqual({ x: 100, y: 68 });
    expect(pointOnCurve(curve, 1)).toEqual({ x: 300, y: 68 });
    expect(pathFromCurve(curve).startsWith('M100 68')).toBe(true);
  });

  it('advances monotonically along x', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1].map((t) => pointOnCurve(curve, t).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('spaces the nodes of Ranvier evenly between the ends, exclusive', () => {
    const nodes = ranvierNodes(curve, 5);
    expect(nodes).toHaveLength(5);
    expect(nodes[0].x).toBeGreaterThan(100);
    expect(nodes[4].x).toBeLessThan(300);
    expect(nodes[2]).toEqual(pointOnCurve(curve, 0.5));
  });
});
