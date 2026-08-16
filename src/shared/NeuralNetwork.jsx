/**
 * The header drawing: the three litpipe stages as a chain of neurons in a field
 * of nerve fibres, with an action potential travelling down each axon and firing
 * across the synaptic cleft into the next stage.
 *
 * The metaphor is the product. Data only ever moves forward, one stage at a
 * time, and nothing reaches the next cell without being released at the
 * terminal — which is exactly what the export/import hand-off does.
 *
 * anime.js drives everything that moves. Identical file in the three apps.
 */
import { useEffect, useRef } from 'react';
import { animate, createScope, stagger, svg } from 'animejs';

import { axonPath, backgroundFibres, dendrites } from './neuralGeometry.js';

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
const SOMA = { rx: 34, ry: 25 };

/** How far past the last cell the outgoing axon runs before leaving the frame. */
const EXIT_X = 1240;

const FIBRES = backgroundFibres({ ...FRAME, count: 24, seed: 11 });

/** Where the axon of stage `index` ends: the synaptic terminal. */
const terminalX = (index) =>
  index + 1 < CELL_X.length ? CELL_X[index + 1] - SOMA.rx - 22 : EXIT_X;

/** Geometry per cell, computed once at module load: it never changes. */
const CELLS = CELL_X.map((cx, index) => ({
  cx,
  cy: CELL_Y,
  dendrites: dendrites({ cx, cy: CELL_Y, count: 9, reach: 64, seed: 3 + index * 17 }),
  axon: axonPath({
    fromX: cx + SOMA.rx,
    toX: terminalX(index),
    y: CELL_Y,
    sag: index % 2 === 0 ? 13 : -13,
  }),
}));

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
      // The action potential: one bright bead per axon, riding the axon path.
      CELLS.forEach((_cell, index) => {
        const path = root.current.querySelector(`#axon-${index}`);
        if (!path) return;

        animate(`#spike-${index}`, {
          ...svg.createMotionPath(path),
          duration: 1900,
          delay: index * 520,
          ease: 'inOut(2)',
          loop: true,
        });

        animate(`#spike-${index}`, {
          opacity: [
            { to: 0, duration: 0 },
            { to: 1, duration: 260 },
            { to: 1, duration: 1180 },
            { to: 0, duration: 460 },
          ],
          delay: index * 520,
          loop: true,
        });

        // The terminal lights up as the spike arrives, then the next cell's
        // soma answers — release, then response, in that order.
        animate(`#terminal-${index}`, {
          opacity: [0.42, 1, 0.42],
          scale: [1, 1.55, 1],
          duration: 620,
          delay: index * 520 + 1500,
          ease: 'out(3)',
          loop: true,
          loopDelay: 1280,
        });
      });

      // The cell you are looking at is the one that is firing.
      animate('#soma-current', {
        scale: [1, 1.05, 1],
        opacity: [0.9, 1, 0.9],
        duration: 2600,
        ease: 'inOutSine',
        loop: true,
      });

      animate('#nucleus-current', {
        opacity: [0.75, 1, 0.75],
        duration: 2600,
        ease: 'inOutSine',
        loop: true,
      });

      // The surrounding tissue breathes, faintly and out of step with itself.
      animate('.fibre', {
        opacity: (element) => {
          const base = Number(element.dataset.opacity);
          return [base, Math.min(base * 2.1, 0.34), base];
        },
        duration: 5200,
        delay: stagger(140),
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
        <radialGradient id="soma-fill" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#8FDBFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#3E9BC9" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#12405C" stopOpacity="0.25" />
        </radialGradient>

        <radialGradient id="nucleus-fill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#C9A7FF" />
          <stop offset="100%" stopColor="#5B34C4" />
        </radialGradient>

        <radialGradient id="haze" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1B4965" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#08192A" stopOpacity="0.95" />
        </radialGradient>

        {/* Darkens the tissue behind the title so the text stays readable at
            any width, without dimming the cells themselves. */}
        <linearGradient id="text-veil" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#08192A" stopOpacity="0.88" />
          <stop offset="45%" stopColor="#08192A" stopOpacity="0.6" />
          <stop offset="72%" stopColor="#08192A" stopOpacity="0" />
        </linearGradient>

        <filter id="glow-cool" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-hot" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={FRAME.width} height={FRAME.height} fill="url(#haze)" />

      {/* The tangle the cells are embedded in. */}
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

      {/* Axons carrying each stage's output to the next. */}
      <g fill="none" strokeLinecap="round">
        {CELLS.map((cell, index) => (
          <path
            key={`axon-${index}`}
            id={`axon-${index}`}
            d={cell.axon}
            stroke="#7FCBEE"
            strokeWidth="3"
            opacity="0.5"
          />
        ))}
      </g>

      {CELLS.map((cell, index) => {
        const stage = stages[index];
        const isCurrent = stage.key === current;

        const cellBody = (
          <g>
            {/* Dendrites: what this stage accepts. */}
            <g fill="none" stroke="#6FC0EA" strokeLinecap="round" opacity={isCurrent ? 0.75 : 0.45}>
              {cell.dendrites.map((branch, branchIndex) => (
                <path key={branchIndex} d={branch.d} strokeWidth={branch.width} />
              ))}
            </g>

            <g
              filter="url(#glow-cool)"
              // The transform origin has to be the cell itself, or scaling it
              // slides the whole soma across the frame.
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              id={isCurrent ? 'soma-current' : undefined}
              opacity={isCurrent ? 1 : 0.78}
            >
              <ellipse
                cx={cell.cx}
                cy={cell.cy}
                rx={SOMA.rx}
                ry={SOMA.ry}
                fill="url(#soma-fill)"
                stroke="#9BE0FF"
                strokeWidth="1.6"
                strokeOpacity={isCurrent ? 0.85 : 0.5}
              />
              <ellipse
                id={isCurrent ? 'nucleus-current' : undefined}
                cx={cell.cx - 3}
                cy={cell.cy - 2}
                rx="12"
                ry="10.5"
                fill="url(#nucleus-fill)"
                opacity={isCurrent ? 0.95 : 0.7}
              />
            </g>

            <text
              x={cell.cx}
              // Close under the soma on purpose: this is the part of the frame
              // the crop keeps at every viewport width.
              y={cell.cy + SOMA.ry + 17}
              textAnchor="middle"
              fontSize="16"
              fontWeight={isCurrent ? 700 : 500}
              fill="#FFFFFF"
              opacity={isCurrent ? 1 : 0.72}
            >
              {index + 1}. {stage.label}
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

      {/* Synaptic terminals and the spikes that reach them. */}
      {CELLS.map((_cell, index) => (
        <g key={`synapse-${index}`}>
          <circle
            id={`terminal-${index}`}
            cx={terminalX(index)}
            cy={CELL_Y}
            r="8"
            fill="#FF7A2F"
            filter="url(#glow-hot)"
            opacity="0.42"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <circle id={`spike-${index}`} r="6" fill="#FFB067" filter="url(#glow-hot)" opacity="0" />
        </g>
      ))}
    </svg>
  );
}
