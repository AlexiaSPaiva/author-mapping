/**
 * Geometry for the co-authorship graph. Pure maths, so it is testable and the
 * SVG component stays a thin renderer.
 *
 * ── Why a circular layout and not a force-directed one ─────────────────────
 * A force-directed graph looks impressive and is ~200 lines of physics
 * simulation (repulsion, spring forces, cooling schedule, collision) whose
 * output changes every run and which I could not defend line by line in an
 * interview. A graph library would be a heavy dependency for one view.
 *
 * A circular layout places nodes deterministically, needs no simulation, and
 * answers the questions I actually have: who is in the field, who is connected
 * to whom, and which ties are strongest. Nodes are ordered by publication volume
 * so the busiest authors sit next to each other and their shared arcs are short.
 *
 * Trade-off, stated in the README: a circle does not reveal clusters the way a
 * force-directed layout can. If cluster structure ever became the question, that
 * is when the extra complexity would earn its place.
 */

/**
 * Places `count` nodes evenly on a circle.
 *
 * Starts at the top (−90°) and goes clockwise, so node 0 — the highest-volume
 * author — is at 12 o'clock where the eye lands first.
 *
 * @param {number} count
 * @param {{ radius: number, centreX: number, centreY: number }} box
 * @returns {{ x: number, y: number, angle: number }[]}
 */
export function circleLayout(count, { radius, centreX, centreY }) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: centreX, y: centreY - radius, angle: -Math.PI / 2 }];

  return Array.from({ length: count }, (_unused, index) => {
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centreX + radius * Math.cos(angle),
      y: centreY + radius * Math.sin(angle),
      angle,
    };
  });
}

/**
 * A quadratic Bézier arc between two points, bowed towards the centre.
 *
 * Bowing inwards keeps edges inside the circle instead of crossing it, which
 * makes a dense graph readable: the chords would otherwise all pass through the
 * middle and overlap. The control point sits between the midpoint of the chord
 * and the centre, proportionally to how far apart the two nodes are — near
 * neighbours get an almost straight line, opposite nodes get a deep curve.
 *
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {{ centreX: number, centreY: number }} centre
 * @param {number} [tension] 0 = straight chord, 1 = curve through the centre.
 * @returns {string} An SVG path `d` attribute.
 */
export function arcPath(from, to, { centreX, centreY }, tension = 0.5) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const controlX = midX + (centreX - midX) * tension;
  const controlY = midY + (centreY - midY) * tension;
  return `M ${round(from.x)} ${round(from.y)} Q ${round(controlX)} ${round(controlY)} ${round(to.x)} ${round(to.y)}`;
}

/** Two decimals is well below one screen pixel and keeps the SVG readable. */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Maps an edge weight to a stroke width.
 *
 * Uses a square root rather than a linear scale: a 12-work collaboration is not
 * twelve times as visually important as a 1-work one, and a linear scale makes
 * heavy edges swamp the picture.
 *
 * @param {number} weight
 * @param {number} maxWeight
 * @param {{ min?: number, max?: number }} [range]
 * @returns {number}
 */
export function edgeWidth(weight, maxWeight, { min = 1, max = 6 } = {}) {
  if (maxWeight <= 1) return min;
  const scaled = Math.sqrt(weight - 1) / Math.sqrt(maxWeight - 1);
  return min + scaled * (max - min);
}

/**
 * Maps a works count to a node radius, again on a square-root scale so one
 * prolific author does not produce a circle that hides its neighbours.
 *
 * @param {number} worksCount
 * @param {number} maxWorks
 * @param {{ min?: number, max?: number }} [range]
 * @returns {number}
 */
export function nodeRadius(worksCount, maxWorks, { min = 4, max = 14 } = {}) {
  if (maxWorks <= 1) return min;
  const scaled = Math.sqrt(worksCount) / Math.sqrt(maxWorks);
  return min + scaled * (max - min);
}

/**
 * Where to put a node's label so it sits outside the circle and reads outwards.
 *
 * @param {{ x: number, y: number, angle: number }} position
 * @param {number} offset Distance beyond the node.
 * @returns {{ x: number, y: number, anchor: 'start' | 'end' }}
 */
export function labelPlacement(position, offset) {
  const pointsLeft = Math.cos(position.angle) < 0;
  return {
    x: position.x + Math.cos(position.angle) * offset,
    y: position.y + Math.sin(position.angle) * offset,
    anchor: pointsLeft ? 'end' : 'start',
  };
}
