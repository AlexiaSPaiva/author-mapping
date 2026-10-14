/**
 * Morphology behind the header drawing. The cells are modelled on cortical
 * pyramidal neurons as they appear in a fluorescence micrograph:
 *
 * - an irregular, roughly triangular soma that flows into its dendrites (no
 *   cartoon ellipse with a coloured nucleus);
 * - one thick apical dendrite and several basal dendrites, each a filled shape
 *   that tapers continuously and branches asymmetrically — a parent continues
 *   while a thinner side branch leaves it, and some branches just end;
 * - dendritic spines on the distal branches;
 * - an axon that leaves through a tapered hillock, gives off a collateral and
 *   ends in a small terminal arbor with synaptic boutons.
 *
 * Everything is pure and seeded: the drawing is identical on every render (React
 * would otherwise reshuffle the network on each state change), and geometry this
 * fiddly is only worth writing if it can be tested without a browser.
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

/** Opacity needs the second decimal. */
const r2 = (value) => Math.round(value * 100) / 100;

/** Point on a quadratic Bézier. */
function quad(p0, c, p1, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

/**
 * A filled outline around a centre line whose width goes from `w0` to `w1`:
 * the way a real neurite tapers, instead of a stroke of constant width.
 *
 * @param {number[][]} points centre line, at least two points
 * @param {number} w0 width at the first point
 * @param {number} w1 width at the last point
 * @returns {string} closed SVG path
 */
export function taperedPath(points, w0, w1) {
  const left = [];
  const right = [];
  const last = points.length - 1;
  points.forEach((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(last, index + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const length = Math.hypot(dx, dy) || 1;
    const half = (w0 + (w1 - w0) * (index / last)) / 2;
    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;
    left.push(`${r1(point[0] + nx)} ${r1(point[1] + ny)}`);
    right.push(`${r1(point[0] - nx)} ${r1(point[1] - ny)}`);
  });
  const tip = points[last];
  return `M${left.join(' L')} L${r1(tip[0])} ${r1(tip[1])} L${right.reverse().join(' L')} Z`;
}

/**
 * Soma outline: a rounded, irregular triangle pointing towards the apical
 * dendrite, closed with a Catmull-Rom spline so it has no corners.
 *
 * @param {{ cx: number, cy: number, size?: number, apical?: number, seed?: number }} options
 * @returns {string} closed SVG path
 */
export function somaPath({ cx, cy, size = 11, apical = -Math.PI / 2, seed = 1 }) {
  const random = seededRandom(seed);
  const count = 9;
  const points = Array.from({ length: count }, (_value, index) => {
    const angle = (index / count) * Math.PI * 2;
    // Pulled out towards the apical pole, flattened at the base: pyramidal.
    const toward = Math.cos(angle - apical);
    const radius =
      size * (0.86 + 0.42 * Math.max(0, toward) ** 3 - 0.08 * toward) * (0.9 + random() * 0.2);
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.92];
  });

  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r1(c1[0])} ${r1(c1[1])}, ${r1(c2[0])} ${r1(c2[1])}, ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d} Z`;
}

/**
 * @typedef {object} Neurite
 * @property {string} d       filled, tapered outline
 * @property {number} order   1 = leaves the soma
 * @property {number[][]} line centre line (used to place spines)
 * @property {number} width   width at the start
 */

/**
 * Grows one dendrite. Branching is asymmetric on purpose: at each point the
 * parent carries on, roughly in its own direction, and a thinner daughter leaves
 * at an angle; branches can terminate early. Widths follow a Rall-like falloff.
 *
 * @param {() => number} random
 * @param {{ x: number, y: number, angle: number, length: number, width: number,
 *   maxOrder: number, out: Neurite[], order?: number, curl?: number }} options
 */
function growDendrite(
  random,
  { x, y, angle, length, width, maxOrder, out, order = 1, curl = 0.35 },
) {
  const end = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
  const bend = (random() - 0.5) * length * curl;
  const control = [
    x + Math.cos(angle) * length * 0.5 - Math.sin(angle) * bend,
    y + Math.sin(angle) * length * 0.5 + Math.cos(angle) * bend,
  ];
  const line = Array.from({ length: 7 }, (_value, index) => quad([x, y], control, end, index / 6));
  const endWidth = Math.max(0.35, width * 0.68);
  out.push({
    d: taperedPath(line, width, endWidth),
    order,
    line: line.map((p) => [r1(p[0]), r1(p[1])]),
    width: r1(width),
  });

  if (order >= maxOrder) return;
  // Distal branches are more likely to just stop, as in a real arbor.
  if (order > 1 && random() < 0.18 * order) return;

  const heading = Math.atan2(end[1] - control[1], end[0] - control[0]);
  const side = random() < 0.5 ? -1 : 1;
  growDendrite(random, {
    x: end[0],
    y: end[1],
    angle: heading + side * (0.08 + random() * 0.22),
    length: length * (0.7 + random() * 0.25),
    width: endWidth * 0.92,
    maxOrder,
    out,
    order: order + 1,
    curl,
  });
  growDendrite(random, {
    x: end[0],
    y: end[1],
    angle: heading - side * (0.45 + random() * 0.5),
    length: length * (0.45 + random() * 0.3),
    width: endWidth * 0.62,
    maxOrder,
    out,
    order: order + 1,
    curl,
  });
}

/**
 * Spines: short protrusions with a small head, along the distal dendrites
 * (order 2 and up), returned as a single path so hundreds of them stay cheap.
 *
 * @param {Neurite[]} dendrites
 * @param {number} seed
 * @returns {{ necks: string, heads: string, count: number }}
 */
export function dendriticSpines(dendrites, seed = 5) {
  const random = seededRandom(seed);
  let necks = '';
  let heads = '';
  let count = 0;
  for (const segment of dendrites) {
    if (segment.order < 2) continue;
    for (let index = 1; index < segment.line.length; index += 1) {
      const [ax, ay] = segment.line[index - 1];
      const [bx, by] = segment.line[index];
      const length = Math.hypot(bx - ax, by - ay) || 1;
      const steps = Math.floor(length / 2.6);
      for (let step = 0; step < steps; step += 1) {
        if (random() < 0.45) continue;
        const t = (step + random()) / Math.max(1, steps);
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        const side = random() < 0.5 ? -1 : 1;
        const spineLength = 1.1 + random() * 1.5;
        const tilt = (random() - 0.5) * 0.9;
        const nx = (-(by - ay) / length) * side;
        const ny = ((bx - ax) / length) * side;
        const ex = px + (nx * Math.cos(tilt) - ny * Math.sin(tilt)) * spineLength;
        const ey = py + (nx * Math.sin(tilt) + ny * Math.cos(tilt)) * spineLength;
        necks += `M${r1(px)} ${r1(py)} L${r1(ex)} ${r1(ey)}`;
        heads += `M${r1(ex)} ${r1(ey)} h0.01`;
        count += 1;
      }
    }
  }
  return { necks, heads, count };
}

/**
 * One pyramidal neuron: soma, apical and basal dendrites, spines.
 *
 * @param {{ cx: number, cy: number, scale?: number, seed?: number, rotation?: number,
 *   basal?: number, apicalLength?: number }} options
 */
export function pyramidalNeuron({
  cx,
  cy,
  scale = 1,
  seed = 1,
  rotation = 0,
  basal = 5,
  apicalLength = 34,
}) {
  const random = seededRandom(seed);
  const dendrites = [];
  const up = -Math.PI / 2 + rotation + (random() - 0.5) * 0.25;
  const size = 9.5 * scale;

  // Apical dendrite: thick, long, few oblique branches, a tuft at the top.
  growDendrite(random, {
    x: cx + Math.cos(up) * size * 0.9,
    y: cy + Math.sin(up) * size * 0.9,
    angle: up,
    length: apicalLength * scale,
    width: 4.2 * scale,
    maxOrder: 4,
    out: dendrites,
    curl: 0.18,
  });

  // Basal dendrites: shorter and thinner, radiating from the base of the soma.
  for (let index = 0; index < basal; index += 1) {
    const spread = Math.PI * 1.15;
    const angle =
      up +
      Math.PI -
      spread / 2 +
      (index / Math.max(1, basal - 1)) * spread +
      (random() - 0.5) * 0.35;
    growDendrite(random, {
      x: cx + Math.cos(angle) * size * 0.7,
      y: cy + Math.sin(angle) * size * 0.7,
      angle,
      length: (17 + random() * 13) * scale,
      width: (2 + random() * 0.8) * scale,
      maxOrder: 3,
      out: dendrites,
      curl: 0.45,
    });
  }

  // Oblique branches leave the apical trunk along its length, not only at its end.
  const trunk = dendrites[0].line;
  [0.32, 0.58, 0.8].forEach((t, index) => {
    const at = trunk[Math.round(t * (trunk.length - 1))];
    const side = index % 2 === 0 ? 1 : -1;
    // Obliques head away from the soma at a shallow angle to the trunk.
    growDendrite(random, {
      x: at[0],
      y: at[1],
      angle: up + side * (0.55 + random() * 0.35),
      length: (13 + random() * 9) * scale,
      width: (1.5 - index * 0.25) * scale,
      maxOrder: 3,
      out: dendrites,
      order: 2,
      curl: 0.7,
    });
  });

  return {
    soma: somaPath({ cx, cy, size, apical: up, seed: seed * 7 + 1 }),
    dendrites,
    spines: dendriticSpines(dendrites, seed * 13 + 3),
  };
}

/**
 * The axon from one cell to the next: a tapered hillock, a thin and slightly
 * wavy shaft, one collateral, and a terminal arbor with synaptic boutons.
 *
 * @param {{ from: number[], to: number[], seed?: number, terminal?: boolean }} options
 */
export function axonPath({ from, to, seed = 1, terminal = true }) {
  const random = seededRandom(seed);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;

  // Hillock: the cone where the action potential starts.
  const hillockEnd = [from[0] + (dx / length) * 9, from[1] + (dy / length) * 9];
  const hillock = taperedPath(
    [from, [(from[0] + hillockEnd[0]) / 2, (from[1] + hillockEnd[1]) / 2], hillockEnd],
    4.4,
    1,
  );

  // Shaft: a gentle meander, sampled so the impulse can travel along it.
  const points = [hillockEnd];
  const samples = 14;
  const phase = random() * Math.PI * 2;
  for (let index = 1; index <= samples; index += 1) {
    const t = index / samples;
    const wave = Math.sin(t * Math.PI * 2.2 + phase) * 4.5 * Math.sin(t * Math.PI);
    points.push([
      hillockEnd[0] + (to[0] - hillockEnd[0]) * t + nx * wave,
      hillockEnd[1] + (to[1] - hillockEnd[1]) * t + ny * wave,
    ]);
  }
  const shaft = `M${points.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(' L')}`;

  // A collateral leaves around the first third and arborises briefly.
  const base = points[Math.floor(samples * 0.35)];
  const collateralEnd = [base[0] + dx * 0.12 + nx * 16, base[1] + dy * 0.12 + ny * 16 + 6];
  const collateral = `M${r1(base[0])} ${r1(base[1])} Q ${r1(base[0] + nx * 10)} ${r1(base[1] + ny * 10 + 3)}, ${r1(collateralEnd[0])} ${r1(collateralEnd[1])}`;

  const boutons = [];
  let arbor = '';
  if (terminal) {
    const tip = points[points.length - 1];
    for (let index = 0; index < 4; index += 1) {
      const angle = Math.atan2(dy, dx) + (index - 1.5) * 0.55 + (random() - 0.5) * 0.3;
      const reach = 6 + random() * 6;
      const end = [tip[0] + Math.cos(angle) * reach, tip[1] + Math.sin(angle) * reach];
      arbor += `M${r1(tip[0])} ${r1(tip[1])} L${r1(end[0])} ${r1(end[1])}`;
      boutons.push({ x: r1(end[0]), y: r1(end[1]), r: r2(1.2 + random() * 0.7) });
    }
  }

  return { hillock, shaft, collateral, arbor, boutons, end: points[points.length - 1].map(r1) };
}

/**
 * Out-of-focus neurons behind the main ones: depth, as in a thick section seen
 * through a confocal microscope.
 *
 * @param {{ width: number, height: number, count?: number, seed?: number }} options
 */
export function backgroundNeurons({ width, height, count = 7, seed = 7 }) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_value, index) => {
    const neuron = pyramidalNeuron({
      cx: r1(random() * width),
      cy: r1(height * (0.15 + random() * 0.8)),
      scale: 0.55 + random() * 0.35,
      seed: seed * 31 + index * 101,
      rotation: (random() - 0.5) * 1.6,
      basal: 4,
      apicalLength: 28,
    });
    return { ...neuron, opacity: r2(0.12 + random() * 0.16), blur: r1(1 + random() * 1.6) };
  });
}
