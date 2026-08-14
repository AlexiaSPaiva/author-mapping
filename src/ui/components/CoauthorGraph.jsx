/**
 * Co-authorship network, drawn as inline SVG with no charting library.
 *
 * All geometry comes from `domain/layout.js`, so this file only renders. The
 * layout is circular and deterministic — see the reasoning at the top of
 * layout.js for why that beats a force-directed simulation here.
 */
import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import {
  arcPath,
  circleLayout,
  edgeWidth,
  labelPlacement,
  nodeRadius,
} from '../../domain/layout.js';

/**
 * The canvas is wider than it is tall on purpose. Labels sit outside the ring
 * and read horizontally, so the space they need is horizontal: with a square
 * canvas the leftmost and rightmost names ran off the viewBox and were clipped.
 */
const WIDTH = 940;
const HEIGHT = 620;
const CENTRE_X = WIDTH / 2;
const CENTRE_Y = HEIGHT / 2;
const RADIUS = HEIGHT / 2 - 60;

/**
 * Node cap. Twenty is the point where labels at the top and bottom of the ring
 * stop colliding: nodes there are close together horizontally, which is exactly
 * where horizontal text needs the most room. The table below the graph shows
 * every author, so this cap limits the picture and never the data.
 */
export const MAX_NODES = 20;

/** Longer names are truncated; the full name is in the node's <title>. */
const MAX_LABEL_CHARS = 24;

/**
 * @param {{
 *   authors: import('../../domain/grouping.js').AuthorSummary[],
 *   edges: { source: string, target: string, weight: number }[],
 *   skippedWorks: number,
 * }} props
 */
export default function CoauthorGraph({ authors, edges, skippedWorks }) {
  const [hovered, setHovered] = useState(null);

  const { nodes, visibleEdges, maxWeight, maxWorks } = useMemo(() => {
    // Authors arrive sorted by volume, so taking the head keeps the busiest.
    const shown = authors.slice(0, MAX_NODES);
    const positions = circleLayout(shown.length, {
      radius: RADIUS,
      centreX: CENTRE_X,
      centreY: CENTRE_Y,
    });
    const shownIds = new Set(shown.map((author) => author.id));

    const built = shown.map((author, index) => ({ ...author, ...positions[index] }));
    const byId = new Map(built.map((node) => [node.id, node]));
    const kept = edges
      .filter((edge) => shownIds.has(edge.source) && shownIds.has(edge.target))
      .map((edge) => ({ ...edge, from: byId.get(edge.source), to: byId.get(edge.target) }));

    return {
      nodes: built,
      visibleEdges: kept,
      maxWeight: Math.max(1, ...kept.map((edge) => edge.weight)),
      maxWorks: Math.max(1, ...built.map((node) => node.worksCount)),
    };
  }, [authors, edges]);

  if (nodes.length === 0) return null;

  const isDimmed = (id) =>
    hovered !== null &&
    hovered !== id &&
    !visibleEdges.some(
      (edge) =>
        (edge.source === hovered && edge.target === id) ||
        (edge.target === hovered && edge.source === id),
    );

  return (
    <Paper component="section" aria-labelledby="graph-heading" className="p-4 sm:p-5">
      <Typography id="graph-heading" variant="h2" component="h2" className="mb-1">
        Co-authorship network
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mb-1">
        Circle size = works in this result set. Line thickness = works co-authored together. Showing
        the {nodes.length} highest-volume author{nodes.length === 1 ? '' : 's'} of {authors.length},
        and {visibleEdges.length} link{visibleEdges.length === 1 ? '' : 's'} between them.
      </Typography>
      {skippedWorks > 0 && (
        <Typography variant="caption" color="text.secondary" className="mb-2 block">
          {skippedWorks} work{skippedWorks === 1 ? '' : 's'} with more than 25 listed authors were
          excluded from the links: a large consortium paper connects everyone to everyone and would
          hide the real collaboration structure.
        </Typography>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="mx-auto block h-auto w-full min-w-[600px] max-w-[940px]"
          role="img"
          aria-label={`Co-authorship network of ${nodes.length} authors with ${visibleEdges.length} collaboration links. The table below lists the same authors.`}
        >
          <g stroke="#1B4965" fill="none">
            {visibleEdges.map((edge) => (
              <path
                key={`${edge.source}-${edge.target}`}
                d={arcPath(edge.from, edge.to, { centreX: CENTRE_X, centreY: CENTRE_Y })}
                strokeWidth={edgeWidth(edge.weight, maxWeight)}
                strokeOpacity={isDimmed(edge.source) && isDimmed(edge.target) ? 0.06 : 0.28}
                strokeLinecap="round"
              />
            ))}
          </g>

          {nodes.map((node) => {
            const radius = nodeRadius(node.worksCount, maxWorks);
            const label = labelPlacement(node, radius + 8);
            const dimmed = isDimmed(node.id);
            return (
              <g
                key={node.id}
                opacity={dimmed ? 0.25 : 1}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle cx={node.x} cy={node.y} r={radius} fill="#1B4965" />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  dominantBaseline="middle"
                  fontSize="11"
                  fill="#16202A"
                >
                  {node.name.length > MAX_LABEL_CHARS
                    ? `${node.name.slice(0, MAX_LABEL_CHARS - 1)}…`
                    : node.name}
                </text>
                <title>
                  {node.name} — {node.worksCount} work
                  {node.worksCount === 1 ? '' : 's'} in this set
                  {node.institution ? `, ${node.institution}` : ''}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    </Paper>
  );
}
