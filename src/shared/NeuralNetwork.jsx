/**
 * The header drawing: the three litpipe stages as a chain of myelinated neurons,
 * drawn as a neuroanatomy figure rather than an illustration — tapering dendritic
 * arbors, a sheathed axon, and an impulse that jumps node to node the way
 * saltatory conduction actually works.
 *
 * The metaphor is the product. Data only ever moves forward, one stage at a
 * time, and nothing reaches the next cell without being released at the
 * terminal — which is exactly what the export/import hand-off does.
 *
 * anime.js drives everything that moves. Identical file in the three apps.
 */
import { useEffect, useRef } from 'react';
import { animate, createScope, stagger, steps, svg } from 'animejs';

import {
  axonCurve,
  backgroundFibres,
  dendriteTree,
  pathFromCurve,
  ranvierNodes,
} from './neuralGeometry.js';

/**
 * Drawing space. The SVG fills the header (slice), so a wide, shallow frame is
 * deliberate: the wider the viewport, the more of the top and bottom the crop
 * eats, and everything that must survive it — the cells and their labels — sits
 * inside the middle band.
 */
export const FRAME = { width: 1200, height: 150 };

/**
 * Where the three cell bodies sit, left to right. They are pushed into the
 * right-hand half of the frame: the left half is where the title sits, and a
 * cell behind a heading is just noise.
 */
const CELL_X = [520, 800, 1080];
const CELL_Y = 68;
const SOMA = { rx: 26, ry: 19 };

/** How far past the last cell the outgoing axon runs before leaving the frame. */
const EXIT_X = 1240;

/** Internodes per axon. Each gap between them is a node of Ranvier. */
const NODE_COUNT = 5;

const FIBRES = backgroundFibres({ ...FRAME, count: 20, seed: 11 });

/** Where the axon of stage `index` ends: the synaptic terminal. */
const terminalX = (index) =>
  index + 1 < CELL_X.length ? CELL_X[index + 1] - SOMA.rx - 26 : EXIT_X;

/** Geometry per cell, computed once at module load: it never changes. */
const CELLS = CELL_X.map((cx, index) => {
  const curve = axonCurve({
    fromX: cx + SOMA.rx,
    toX: terminalX(index),
    y: CELL_Y,
    sag: index % 2 === 0 ? 11 : -11,
  });

  return {
    cx,
    cy: CELL_Y,
    dendrites: dendriteTree({
      cx,
      cy: CELL_Y,
      primary: 7,
      orders: 3,
      reach: 46,
      seed: 3 + index * 17,
    }),
    axon: pathFromCurve(curve),
    nodes: ranvierNodes(curve, NODE_COUNT),
  };
});

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', stages: { key: string, name: string, label: string, url: string }[] }} props
 */
export default function NeuralNetwork({ current, stages }) {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    // A header that pulses forever is a genuine problem with a vestibular
    // disorder. The drawing carries its meaning standing still, so under
    // prefers-reduced-motion nothing is started at all.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    scope.current = createScope({ root }).add(() => {
      CELLS.forEach((_cell, index) => {
        const path = root.current.querySelector(`#axon-${index}`);
        if (!path) return;

        // Saltatory conduction: the impulse is regenerated at each node of
        // Ranvier, so it steps between them instead of sliding along the fibre.
        animate(`#spike-${index}`, {
          ...svg.createMotionPath(path),
          duration: 1500,
          delay: index * 420,
          ease: steps(NODE_COUNT + 1),
          loop: true,
        });

        animate(`#spike-${index}`, {
          opacity: [
            { to: 0, duration: 0 },
            { to: 1, duration: 180 },
            { to: 1, duration: 900 },
            { to: 0, duration: 420 },
          ],
          delay: index * 420,
          loop: true,
        });

        // Vesicle release: the terminal brightens as the impulse arrives.
        animate(`#terminal-${index}`, {
          opacity: [0.45, 1, 0.45],
          duration: 520,
          delay: index * 420 + 1300,
          ease: 'out(3)',
          loop: true,
          loopDelay: 1000,
        });
      });

      // The cell you are looking at is the one that is firing. Kept to a change
      // in membrane brightness rather than a change in size: a soma that
      // inflates and deflates is not what a cell does.
      animate('#soma-current', {
        opacity: [0.72, 1, 0.72],
        duration: 2400,
        ease: 'inOutSine',
        loop: true,
      });

      // The surrounding tissue breathes, faintly and out of step with itself.
      animate('.fibre', {
        opacity: (element) => {
          const base = Number(element.dataset.opacity);
          return [base, Math.min(base * 2, 0.22), base];
        },
        duration: 5600,
        delay: stagger(160),
        ease: 'inOutSine',
        loop: true,
      });
    });

    return () => scope.current?.revert();
  }, [current]);

  return (
    <svg
      ref={root}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Cytoplasm: a plain, low-contrast wash. The structure is carried by
            the outline, as in a plate from an atlas. */}
        <radialGradient id="soma-fill" cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#8FD3F4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2E7BA6" stopOpacity="0.16" />
        </radialGradient>

        <radialGradient id="haze" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="#123A52" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#08192A" stopOpacity="1" />
        </radialGradient>

        {/* Darkens the tissue behind the title so the text stays readable at
            any width, without dimming the cells themselves. */}
        <linearGradient id="text-veil" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#08192A" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#08192A" stopOpacity="0.62" />
          <stop offset="72%" stopColor="#08192A" stopOpacity="0" />
        </linearGradient>

        {/* One soft pass only: enough to read as a wet-mount micrograph, not
            enough to look like neon. */}
        <filter id="glow-soft" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={FRAME.width} height={FRAME.height} fill="url(#haze)" />

      {/* The tissue the cells are embedded in. */}
      <g fill="none" stroke="#5FA8D3" strokeLinecap="round">
        {FIBRES.map((fibre, index) => (
          <path
            key={`fibre-${index}`}
            className="fibre"
            data-opacity={fibre.opacity}
            d={fibre.d}
            strokeWidth={fibre.width}
            opacity={fibre.opacity}
          />
        ))}
      </g>

      <rect width={FRAME.width} height={FRAME.height} fill="url(#text-veil)" />

      {/* Axons: a thin axolemma under a segmented myelin sheath. The gaps in
          the sheath are the nodes of Ranvier. */}
      {CELLS.map((cell, index) => (
        <g key={`axon-group-${index}`} fill="none">
          <path
            id={`axon-${index}`}
            d={cell.axon}
            stroke="#8FD3F4"
            strokeWidth="1.4"
            opacity="0.7"
          />
          <path
            d={cell.axon}
            stroke="#5FA8D3"
            strokeWidth="6"
            strokeOpacity="0.22"
            strokeLinecap="butt"
            strokeDasharray="26 9"
          />
          {cell.nodes.map((node, nodeIndex) => (
            <circle key={nodeIndex} cx={node.x} cy={node.y} r="1.6" fill="#8FD3F4" opacity="0.55" />
          ))}
        </g>
      ))}

      {CELLS.map((cell, index) => {
        const stage = stages[index];
        const isCurrent = stage.key === current;

        const cellBody = (
          <g>
            {/* Dendritic arbor: what this stage accepts. */}
            <g fill="none" stroke="#7FC4E8" strokeLinecap="round" opacity={isCurrent ? 0.85 : 0.5}>
              {cell.dendrites.map((segment, segmentIndex) => (
                <path
                  key={segmentIndex}
                  d={segment.d}
                  strokeWidth={segment.width}
                  strokeOpacity={1 - (segment.order - 1) * 0.18}
                />
              ))}
            </g>

            <g
              id={isCurrent ? 'soma-current' : undefined}
              opacity={isCurrent ? 1 : 0.72}
              filter={isCurrent ? 'url(#glow-soft)' : undefined}
            >
              {/* Soma: outline first, wash second — the outline is the figure. */}
              <ellipse
                cx={cell.cx}
                cy={cell.cy}
                rx={SOMA.rx}
                ry={SOMA.ry}
                fill="url(#soma-fill)"
                stroke="#9BDCFB"
                strokeWidth="1.3"
                strokeOpacity={isCurrent ? 0.95 : 0.6}
              />
              {/* Nucleus and, inside it, the nucleolus. */}
              <ellipse
                cx={cell.cx - 2}
                cy={cell.cy - 1}
                rx="8.5"
                ry="7"
                fill="#7E62C8"
                fillOpacity="0.5"
                stroke="#C3ABF2"
                strokeWidth="1"
                strokeOpacity="0.75"
              />
              <circle cx={cell.cx - 3.5} cy={cell.cy - 2} r="2.4" fill="#D9CBFA" opacity="0.8" />
            </g>

            <text
              x={cell.cx}
              // Close under the soma on purpose: this is the part of the frame
              // the crop keeps at every viewport width.
              y={cell.cy + SOMA.ry + 20}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isCurrent ? 700 : 500}
              letterSpacing="1.6"
              fill="#FFFFFF"
              opacity={isCurrent ? 0.95 : 0.6}
            >
              {`${index + 1} · ${stage.label.toUpperCase()}`}
            </text>
          </g>
        );

        return isCurrent ? (
          <g key={stage.key}>{cellBody}</g>
        ) : (
          // Clickable with a pointer; the keyboard path is the link list in the
          // header, so this one stays out of the tab order.
          <a
            key={stage.key}
            href={stage.url}
            tabIndex={-1}
            className="pointer-events-auto cursor-pointer"
          >
            {cellBody}
          </a>
        );
      })}

      {/* Synaptic terminals and the impulses that reach them. */}
      {CELLS.map((_cell, index) => (
        <g key={`synapse-${index}`}>
          <circle
            id={`terminal-${index}`}
            cx={terminalX(index)}
            cy={CELL_Y}
            r="4.5"
            fill="#E8A33D"
            stroke="#F6C87A"
            strokeWidth="1"
            filter="url(#glow-soft)"
            opacity="0.45"
          />
          <circle
            id={`spike-${index}`}
            r="3.4"
            fill="#F6C87A"
            filter="url(#glow-soft)"
            opacity="0"
          />
        </g>
      ))}
    </svg>
  );
}
