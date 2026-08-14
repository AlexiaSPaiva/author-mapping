import { describe, it, expect } from 'vitest';
import { arcPath, circleLayout, edgeWidth, labelPlacement, nodeRadius } from './layout.js';

const box = { radius: 100, centreX: 200, centreY: 200 };

describe('circleLayout', () => {
  it('places the first node at the top of the circle', () => {
    const [first] = circleLayout(4, box);
    expect(first.x).toBeCloseTo(200, 6);
    expect(first.y).toBeCloseTo(100, 6);
  });

  it('spreads four nodes to the four compass points, clockwise', () => {
    const points = circleLayout(4, box).map((p) => [Math.round(p.x), Math.round(p.y)]);
    expect(points).toEqual([
      [200, 100], // top
      [300, 200], // right
      [200, 300], // bottom
      [100, 200], // left
    ]);
  });

  it('keeps every node on the circle', () => {
    for (const point of circleLayout(9, box)) {
      const distance = Math.hypot(point.x - box.centreX, point.y - box.centreY);
      expect(distance).toBeCloseTo(box.radius, 6);
    }
  });

  it('handles zero and one node', () => {
    expect(circleLayout(0, box)).toEqual([]);
    expect(circleLayout(-3, box)).toEqual([]);
    expect(circleLayout(1, box)[0]).toEqual({ x: 200, y: 100, angle: -Math.PI / 2 });
  });

  it('is deterministic: the same input gives the same positions', () => {
    expect(circleLayout(7, box)).toEqual(circleLayout(7, box));
  });
});

describe('arcPath', () => {
  const from = { x: 100, y: 200 };
  const to = { x: 300, y: 200 };

  it('produces a quadratic Bézier path between the two points', () => {
    expect(arcPath(from, to, box)).toBe('M 100 200 Q 200 200 300 200');
  });

  it('bows towards the centre', () => {
    // Two nodes at the top of the circle: the control point must sit below them,
    // i.e. inside the circle, not outside it.
    const a = { x: 150, y: 120 };
    const b = { x: 250, y: 120 };
    const control = arcPath(a, b, box, 0.5).match(/Q ([\d.-]+) ([\d.-]+)/);
    expect(Number(control[2])).toBeGreaterThan(120);
  });

  it('draws a straight chord at zero tension', () => {
    const control = arcPath(from, to, box, 0).match(/Q ([\d.-]+) ([\d.-]+)/);
    expect(Number(control[1])).toBeCloseTo(200, 6);
    expect(Number(control[2])).toBeCloseTo(200, 6);
  });
});

describe('edgeWidth', () => {
  it('gives the minimum width to the lightest edge', () => {
    expect(edgeWidth(1, 10)).toBe(1);
  });

  it('gives the maximum width to the heaviest edge', () => {
    expect(edgeWidth(10, 10)).toBeCloseTo(6, 6);
  });

  it('grows sub-linearly, so a heavy edge does not swamp the picture', () => {
    // Halfway in weight must be more than halfway in width on a sqrt scale.
    const half = edgeWidth(5, 9);
    expect(half).toBeGreaterThan(edgeWidth(1, 9) + (edgeWidth(9, 9) - edgeWidth(1, 9)) / 2);
  });

  it('falls back to the minimum when every edge has weight 1', () => {
    expect(edgeWidth(1, 1)).toBe(1);
  });
});

describe('nodeRadius', () => {
  it('gives the maximum radius to the most prolific author', () => {
    expect(nodeRadius(16, 16)).toBeCloseTo(14, 6);
  });

  it('never returns less than the minimum', () => {
    expect(nodeRadius(1, 16)).toBeGreaterThanOrEqual(4);
  });

  it('falls back to the minimum when everyone has one work', () => {
    expect(nodeRadius(1, 1)).toBe(4);
  });
});

describe('labelPlacement', () => {
  it('anchors labels on the right half outwards to the right', () => {
    const right = labelPlacement({ x: 300, y: 200, angle: 0 }, 10);
    expect(right.anchor).toBe('start');
    expect(right.x).toBeCloseTo(310, 6);
  });

  it('anchors labels on the left half outwards to the left', () => {
    const left = labelPlacement({ x: 100, y: 200, angle: Math.PI }, 10);
    expect(left.anchor).toBe('end');
    expect(left.x).toBeCloseTo(90, 6);
  });
});
