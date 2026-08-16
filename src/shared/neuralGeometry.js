/**
 * The shapes behind the header drawing, built to read as a neuroanatomy figure
 * rather than an illustration: a dendritic arbor that branches and thins the way
 * a real one does, and a myelinated axon whose nodes of Ranvier are where the
 * impulse actually jumps.
 *
 * Everything here is pure and seeded. Two reasons: the drawing must be identical
 * on every render (React would otherwise reshuffle the whole network on each
 * state change, which reads as flicker), and geometry this fiddly is only worth
 * writing if it can be tested without a browser.
 *
 * Identical file in the three litpipe apps.
 */

/**
 * Small deterministic PRNG (mulberry32). Not cryptographic — it only has to be
 * repeatable and cheap.
 *
 * @param {number} seed
 * @returns {() => number} successive values in [0, 1)
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounds to one decimal: shorter path strings, no visible loss. */
const r1 = (value) => Math.round(value * 10) / 10;

/** Opacity needs the second decimal — at one, 0.17 rounds up to a visible 0.2. */
const r2 = (value) => Math.round(value * 100) / 100;

/**
 * The out-of-focus tissue the cells sit in. Kept deliberately faint and thin:
 * in a figure, background structure is context, not decoration.
 *
 * @param {{ width: number, height: number, count?: number, seed?: number }} options
 * @returns {{ d: string, width: number, opacity: number }[]}
 */
export function backgroundFibres({ width, height, count = 22, seed = 7 }) {
  const random = seededRandom(seed);
  const fibres = [];

  for (let index = 0; index < count; index += 1) {
    const startY = random() * height * 1.4 - height * 0.2;
    const endY = random() * height * 1.4 - height * 0.2;
    const sag = (random() - 0.5) * height * 1.1;
    const startX = -width * 0.1 - random() * width * 0.1;
    const endX = width * 1.1 + random() * width * 0.1;

    fibres.push({
      d:
        `M${r1(startX)} ${r1(startY)} ` +
        `C ${r1(width * 0.3)} ${r1(startY + sag)}, ` +
        `${r1(width * 0.7)} ${r1(endY - sag)}, ` +
        `${r1(endX)} ${r1(endY)}`,
      width: r1(0.4 + random() * 0.9),
      opacity: r2(0.05 + random() * 0.12),
    });
  }

  return fibres;
}

/**
 * A dendritic arbor: primary branches leaving the soma, each splitting into two
 * at every order, thinning as it goes. Real arbors taper and bifurcate; a fan of
 * equal-weight lines does not read as tissue.
 *
 * @param {{
 *   cx: number, cy: number,
 *   primary?: number, orders?: number, reach?: number,
 *   seed?: number, skipRight?: boolean, flatten?: number,
 * }} options
 * @returns {{ d: string, width: number, order: number }[]}
 */
export function dendriteTree({
  cx,
  cy,
  primary = 7,
  orders = 3,
  reach = 62,
  seed = 3,
  skipRight = true,
  flatten = 0.66,
}) {
  const random = seededRandom(seed);
  const segments = [];

  /** One segment, then its two children, until the order budget runs out. */
  const grow = (x, y, angle, length, order) => {
    // Curvature falls with order: trunks sweep, twigs are nearly straight.
    const bend = (random() - 0.5) * length * (0.5 / order);
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length * flatten;
    const controlX = x + Math.cos(angle) * length * 0.55 - Math.sin(angle) * bend;
    const controlY = y + Math.sin(angle) * length * 0.55 * flatten + Math.cos(angle) * bend;

    segments.push({
      d: `M${r1(x)} ${r1(y)} Q ${r1(controlX)} ${r1(controlY)}, ${r1(endX)} ${r1(endY)}`,
      // 2.1, 1.4, 0.9, 0.6 … tapering by order, as in a real arbor.
      width: r1(2.1 / (1 + (order - 1) * 0.55)),
      order,
    });

    if (order >= orders) return;

    const split = 0.34 + random() * 0.3;
    grow(endX, endY, angle - split, length * (0.62 + random() * 0.12), order + 1);
    grow(endX, endY, angle + split, length * (0.62 + random() * 0.12), order + 1);
  };

  for (let index = 0; index < primary; index += 1) {
    // Leave the right-hand sector free: that is where the axon leaves, and a
    // dendrite there would read as a fork in the signal path rather than input.
    const spread = skipRight ? Math.PI * 1.3 : Math.PI * 2;
    const offset = skipRight ? Math.PI * 0.35 : 0;
    const angle = offset + (index / primary) * spread + (random() - 0.5) * 0.16;
    grow(cx, cy, angle, reach * (0.62 + random() * 0.5), 1);
  }

  return segments;
}

/**
 * The axon between two stages, as a cubic curve. Returned as points rather than
 * a path string so the myelin sheath and the nodes can be placed along it.
 *
 * @param {{ fromX: number, toX: number, y: number, sag?: number }} options
 * @returns {{ p0: number[], p1: number[], p2: number[], p3: number[] }}
 */
export function axonCurve({ fromX, toX, y, sag = 13 }) {
  const span = toX - fromX;
  return {
    p0: [fromX, y],
    p1: [fromX + span * 0.3, y - sag],
    p2: [fromX + span * 0.7, y + sag],
    p3: [toX, y],
  };
}

/**
 * @param {ReturnType<typeof axonCurve>} curve
 * @returns {string} an SVG path
 */
export function pathFromCurve({ p0, p1, p2, p3 }) {
  return (
    `M${r1(p0[0])} ${r1(p0[1])} ` +
    `C ${r1(p1[0])} ${r1(p1[1])}, ${r1(p2[0])} ${r1(p2[1])}, ${r1(p3[0])} ${r1(p3[1])}`
  );
}

/**
 * Point at parameter `t` along a cubic Bézier.
 *
 * @param {ReturnType<typeof axonCurve>} curve
 * @param {number} t in [0, 1]
 * @returns {{ x: number, y: number }}
 */
export function pointOnCurve({ p0, p1, p2, p3 }, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: r1(a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0]),
    y: r1(a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]),
  };
}

/**
 * The nodes of Ranvier: the gaps between myelin sheaths, evenly spaced along the
 * axon. The impulse is redrawn at each one — that is what saltatory conduction
 * is, and it is why the spike in the header jumps instead of sliding.
 *
 * @param {ReturnType<typeof axonCurve>} curve
 * @param {number} [count]
 * @returns {{ x: number, y: number }[]}
 */
export function ranvierNodes(curve, count = 5) {
  return Array.from({ length: count }, (_value, index) =>
    pointOnCurve(curve, (index + 1) / (count + 1)),
  );
}
