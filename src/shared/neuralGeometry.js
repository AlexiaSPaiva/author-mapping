/**
 * The shapes behind the header drawing: a field of nerve fibres, the dendrite
 * tree of one cell, and the axon that carries a stage's output to the next one.
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

/**
 * The out-of-focus tangle the cells sit in. Each fibre is a long cubic curve
 * crossing the frame, thin and faint enough to stay background.
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
      width: r1(0.6 + random() * 1.8),
      opacity: r1(0.06 + random() * 0.2),
    });
  }

  return fibres;
}

/**
 * The dendrite tree of one cell: branches leaving the soma, each one forking
 * once, the way a real arbor thins as it spreads.
 *
 * @param {{ cx: number, cy: number, count?: number, reach?: number, seed?: number, skipRight?: boolean }} options
 * @returns {{ d: string, width: number }[]}
 */
export function dendrites({ cx, cy, count = 9, reach = 78, seed = 3, skipRight = true }) {
  const random = seededRandom(seed);
  const branches = [];

  for (let index = 0; index < count; index += 1) {
    // Spread the branches around the cell, leaving the right-hand sector free:
    // that is where the axon leaves, and a dendrite there would read as a fork
    // in the signal path rather than an input.
    const spread = skipRight ? Math.PI * 1.35 : Math.PI * 2;
    const offset = skipRight ? Math.PI * 0.33 : 0;
    const angle = offset + (index / count) * spread + (random() - 0.5) * 0.22;

    const length = reach * (0.6 + random() * 0.8);
    const tipX = cx + Math.cos(angle) * length;
    const tipY = cy + Math.sin(angle) * length * 0.72;
    // Two control points, bending opposite ways: a dendrite that curves once
    // reads as a wire, one that curves back reads as tissue.
    const bend = (random() - 0.4) * 52;

    branches.push({
      d:
        `M${r1(cx)} ${r1(cy)} ` +
        `C ${r1(cx + Math.cos(angle) * length * 0.3 + bend * 0.5)} ${r1(cy + Math.sin(angle) * length * 0.3 + bend * 0.6)}, ` +
        `${r1(cx + Math.cos(angle) * length * 0.72 - bend * 0.4)} ${r1(cy + Math.sin(angle) * length * 0.6 - bend * 0.5)}, ` +
        `${r1(tipX)} ${r1(tipY)}`,
      width: r1(1.6 + random() * 1.1),
    });

    // One fork per branch, from about two thirds along it.
    const forkAngle = angle + (random() - 0.5) * 0.9;
    const forkLength = length * (0.3 + random() * 0.3);
    branches.push({
      d:
        `M${r1(cx + Math.cos(angle) * length * 0.66)} ${r1(cy + Math.sin(angle) * length * 0.48)} ` +
        `q ${r1(Math.cos(forkAngle) * forkLength * 0.6)} ${r1(Math.sin(forkAngle) * forkLength * 0.4)}, ` +
        `${r1(Math.cos(forkAngle) * forkLength)} ${r1(Math.sin(forkAngle) * forkLength * 0.8)}`,
      width: r1(0.7 + random() * 0.6),
    });
  }

  return branches;
}

/**
 * The axon between two stages: leaves the soma, sags slightly, and ends just
 * short of the next cell — the gap is the synaptic cleft, and it is meant to be
 * visible.
 *
 * @param {{ fromX: number, toX: number, y: number, sag?: number }} options
 * @returns {string} an SVG path
 */
export function axonPath({ fromX, toX, y, sag = 16 }) {
  const span = toX - fromX;
  return (
    `M${r1(fromX)} ${r1(y)} ` +
    `C ${r1(fromX + span * 0.3)} ${r1(y - sag)}, ` +
    `${r1(fromX + span * 0.7)} ${r1(y + sag)}, ` +
    `${r1(toX)} ${r1(y)}`
  );
}
