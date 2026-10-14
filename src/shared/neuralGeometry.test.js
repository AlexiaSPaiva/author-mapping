import { describe, expect, it } from 'vitest';

import {
  axonPath,
  backgroundNeurons,
  dendriticSpines,
  pyramidalNeuron,
  seededRandom,
  somaPath,
  taperedPath,
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

describe('taperedPath', () => {
  it('is a closed outline that ends in a point', () => {
    const d = taperedPath(
      [
        [0, 0],
        [10, 0],
        [20, 0],
      ],
      4,
      1,
    );
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('L20 0');
  });

  it('is wider at the start than at the end', () => {
    const d = taperedPath(
      [
        [0, 0],
        [20, 0],
      ],
      6,
      2,
    );
    // Start: y = ±3; end: y = ±1.
    expect(d.startsWith('M0 3')).toBe(true);
    expect(d).toContain('20 1');
  });
});

describe('somaPath', () => {
  it('is a smooth closed shape around the centre', () => {
    const d = somaPath({ cx: 100, cy: 50, size: 10, seed: 2 });
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(9);
  });

  it('reaches further towards the apical pole than towards the base', () => {
    const d = somaPath({ cx: 100, cy: 50, size: 10, apical: -Math.PI / 2, seed: 2 });
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(50 - Math.min(...ys)).toBeGreaterThan(Math.max(...ys) - 50);
  });
});

describe('pyramidalNeuron', () => {
  const neuron = pyramidalNeuron({ cx: 520, cy: 74, seed: 5 });

  it('is identical on every call, so a re-render does not reshuffle the cell', () => {
    expect(pyramidalNeuron({ cx: 520, cy: 74, seed: 5 })).toEqual(neuron);
  });

  it('has one apical and several basal dendrites leaving the soma', () => {
    const primaries = neuron.dendrites.filter((segment) => segment.order === 1);
    expect(primaries).toHaveLength(6);
  });

  it('branches asymmetrically: daughters are thinner than their parent', () => {
    const widest = (order) =>
      Math.max(...neuron.dendrites.filter((s) => s.order === order).map((s) => s.width));
    expect(widest(1)).toBeGreaterThan(widest(2));
    expect(widest(2)).toBeGreaterThan(widest(3));
  });

  it('has spines, only on distal branches', () => {
    expect(neuron.spines.count).toBeGreaterThan(20);
    const proximalOnly = dendriticSpines(
      neuron.dendrites.filter((s) => s.order === 1),
      3,
    );
    expect(proximalOnly.count).toBe(0);
  });
});

describe('axonPath', () => {
  const axon = axonPath({ from: [528, 77], to: [770, 90], seed: 41 });

  it('ends where it was asked to, at the next cell', () => {
    expect(axon.end).toEqual([770, 90]);
    expect(axon.shaft.startsWith('M')).toBe(true);
  });

  it('starts with a tapered hillock and ends in boutons', () => {
    expect(axon.hillock.endsWith('Z')).toBe(true);
    expect(axon.boutons).toHaveLength(4);
  });

  it('has no terminal arbor when it leaves the frame', () => {
    const exit = axonPath({ from: [1088, 77], to: [1250, 84], terminal: false });
    expect(exit.boutons).toHaveLength(0);
    expect(exit.arbor).toBe('');
  });
});

describe('backgroundNeurons', () => {
  const options = { width: 1200, height: 150, count: 6, seed: 7 };

  it('draws the requested number of out-of-focus cells, faint and blurred', () => {
    const cells = backgroundNeurons(options);
    expect(cells).toHaveLength(6);
    expect(cells.every((cell) => cell.opacity <= 0.28 && cell.blur >= 1)).toBe(true);
  });

  it('is stable across calls', () => {
    expect(backgroundNeurons(options)).toEqual(backgroundNeurons(options));
  });
});
