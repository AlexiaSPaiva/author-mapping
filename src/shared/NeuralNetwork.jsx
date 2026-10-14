/**
 * The header drawing: the three litpipe stages as a chain of cortical pyramidal
 * neurons, rendered like a fluorescence micrograph — irregular somata, tapering
 * and asymmetrically branching dendrites with spines, axons with a hillock, a
 * collateral and synaptic boutons, and out-of-focus cells behind them for depth.
 *
 * The metaphor is the product. Data only ever moves forward, one stage at a
 * time, and nothing reaches the next cell without being released at the
 * terminal — which is exactly what the export/import hand-off does.
 *
 * anime.js drives the activity, in physiological order: input arrives at the
 * dendrites, the soma fires, the action potential travels down the axon, the
 * boutons release, and the next cell receives it. Identical file in the three apps.
 */
import { useEffect, useRef } from 'react';
import { animate, createScope, createTimeline, svg } from 'animejs';

import { axonPath, backgroundNeurons, pyramidalNeuron } from './neuralGeometry.js';

/**
 * Drawing space. The SVG fills the header (slice), so a wide, shallow frame is
 * deliberate: the wider the viewport, the more of the top and bottom the crop
 * eats, and everything that must survive it — the cells and their labels — sits
 * inside the middle band.
 */
export const FRAME = { width: 1200, height: 150 };

/**
 * Where the three cell bodies sit, left to right, pushed into the right-hand
 * half of the frame: the left half is where the title sits.
 */
const CELL_X = [520, 800, 1080];
const CELL_Y = 74;

/** How far past the last cell the outgoing axon runs before leaving the frame. */
const EXIT_X = 1250;

const BACKGROUND = backgroundNeurons({ ...FRAME, count: 9, seed: 11 });

/** Geometry per cell, computed once at module load: it never changes. */
const CELLS = CELL_X.map((cx, index) => {
  const neuron = pyramidalNeuron({ cx, cy: CELL_Y, seed: 5 + index * 19, basal: 5 });
  const isLast = index === CELL_X.length - 1;
  const axon = axonPath({
    from: [cx + 8, CELL_Y + 3],
    // Ends among the basal dendrites of the next cell, where the synapse is.
    to: isLast ? [EXIT_X, CELL_Y + 10] : [CELL_X[index + 1] - 30, CELL_Y + 16],
    seed: 41 + index * 7,
    terminal: !isLast,
  });
  return { cx, cy: CELL_Y, ...neuron, axon };
});

/** Fluorescent label colours: bright core, cooler periphery. */
const MEMBRANE = '#8CCFF0';
const CORE = '#DDF3FF';

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
      const timeline = createTimeline({ loop: true, loopDelay: 1400 });

      CELLS.forEach((_cell, index) => {
        const start = index * 1550;
        const spike = root.current.querySelector(`#ap-${index}`);
        if (!spike) return;
        const [drawable] = svg.createDrawable(spike);

        timeline
          // Synaptic input reaches the dendrites (spontaneous for the first cell).
          .add(`#input-${index}`, { opacity: [0, 0.5, 0], duration: 800, ease: 'inOutSine' }, start)
          // The soma integrates and fires.
          .add(
            `#fire-${index}`,
            { opacity: [0, 0.9, 0], duration: 700, ease: 'out(3)' },
            start + 380,
          )
          // The action potential travels down the axon as a short bright front.
          .add(
            drawable,
            { draw: ['0 0', '0 0.12', '0.88 1', '1 1'], duration: 1050, ease: 'linear' },
            start + 560,
          )
          .add(
            spike,
            {
              opacity: [
                { to: 1, duration: 90 },
                { to: 1, duration: 870 },
                { to: 0, duration: 90 },
              ],
            },
            start + 560,
          )
          // Vesicle release at the boutons.
          .add(
            `#boutons-${index}`,
            { opacity: [0.5, 1, 0.5], duration: 520, ease: 'out(2)' },
            start + 1500,
          );
      });

      // The out-of-focus layer drifts very slowly, like a stage being nudged.
      animate('#depth', {
        x: [-5, 5],
        duration: 16000,
        ease: 'inOutSine',
        alternate: true,
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
        <radialGradient id="haze" cx="62%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#0E2F45" />
          <stop offset="100%" stopColor="#06121D" />
        </radialGradient>

        {/* Somata are brightest at the centre, as with a cytoplasmic label. */}
        <radialGradient id="soma-fill" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={CORE} />
          <stop offset="100%" stopColor={MEMBRANE} />
        </radialGradient>

        {/* Darkens the tissue behind the title so the text stays readable. */}
        <linearGradient id="text-veil" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#06121D" stopOpacity="0.92" />
          <stop offset="40%" stopColor="#06121D" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#06121D" stopOpacity="0" />
        </linearGradient>

        {/* The halo of a fluorescent label: one soft pass under the sharp shape. */}
        <filter id="fluorescence" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="halo" />
          <feColorMatrix
            in="halo"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* The impulse: a soft travelling front, brighter at its core. */}
        <filter id="impulse" x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="core" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="wide" />
            <feMergeNode in="core" />
          </feMerge>
        </filter>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id="defocus-near">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id="defocus-far">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <rect width={FRAME.width} height={FRAME.height} fill="url(#haze)" />

      {/* Cells above and below the focal plane. */}
      <g id="depth" fill={MEMBRANE}>
        {BACKGROUND.map((neuron, index) => (
          <g
            key={`depth-${index}`}
            opacity={neuron.opacity}
            filter={neuron.blur > 1.8 ? 'url(#defocus-far)' : 'url(#defocus-near)'}
          >
            {neuron.dendrites.map((segment, segmentIndex) => (
              <path key={segmentIndex} d={segment.d} />
            ))}
            <path d={neuron.soma} />
          </g>
        ))}
      </g>

      <rect width={FRAME.width} height={FRAME.height} fill="url(#text-veil)" />

      {/* Axons: hillock, shaft, collateral, terminal arbor and boutons. */}
      {CELLS.map((cell, index) => (
        <g key={`axon-${index}`}>
          <g filter="url(#fluorescence)" opacity="0.85">
            <path d={cell.axon.hillock} fill={MEMBRANE} />
            <g fill="none" stroke={MEMBRANE} strokeLinecap="round">
              <path d={cell.axon.shaft} strokeWidth="0.9" />
              <path d={cell.axon.collateral} strokeWidth="0.55" opacity="0.7" />
              <path d={cell.axon.arbor} strokeWidth="0.6" />
            </g>
            <g id={`boutons-${index}`} fill={CORE} opacity="0.5">
              {cell.axon.boutons.map((bouton, boutonIndex) => (
                <circle key={boutonIndex} cx={bouton.x} cy={bouton.y} r={bouton.r} />
              ))}
            </g>
          </g>
          {/* The travelling action potential, drawn over the shaft. */}
          <path
            id={`ap-${index}`}
            d={cell.axon.shaft}
            fill="none"
            stroke="#D8F2FF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0"
            filter="url(#impulse)"
          />
        </g>
      ))}

      {CELLS.map((cell, index) => {
        const stage = stages[index];
        const isCurrent = stage.key === current;

        const cellBody = (
          <g>
            <g opacity={isCurrent ? 1 : 0.58} filter="url(#fluorescence)">
              <g fill={MEMBRANE}>
                {cell.dendrites.map((segment, segmentIndex) => (
                  <path key={segmentIndex} d={segment.d} />
                ))}
              </g>
              <g fill="none" stroke={MEMBRANE} strokeLinecap="round">
                <path d={cell.spines.necks} strokeWidth="0.35" opacity="0.75" />
                <path d={cell.spines.heads} strokeWidth="0.85" opacity="0.85" />
              </g>
              <path d={cell.soma} fill="url(#soma-fill)" />
              {/* The nucleus shows as a darker, unlabelled region. */}
              <ellipse
                cx={cell.cx - 0.5}
                cy={cell.cy + 1}
                rx="4.2"
                ry="3.6"
                fill="#0B2A3F"
                opacity="0.18"
                filter="url(#defocus-far)"
              />
            </g>

            {/* Activity overlays, animated: dendritic input and somatic firing. */}
            <g id={`input-${index}`} opacity="0" fill={CORE} filter="url(#glow)">
              {cell.dendrites
                .filter((segment) => segment.order <= 2)
                .map((segment, segmentIndex) => (
                  <path key={segmentIndex} d={segment.d} />
                ))}
            </g>
            <path
              id={`fire-${index}`}
              d={cell.soma}
              fill="#FFFFFF"
              opacity="0"
              filter="url(#glow)"
            />

            <text
              className="neuron-label"
              x={cell.cx}
              // Under the cell on purpose: this is the part of the frame the
              // crop keeps at every viewport width.
              y={cell.cy + 40}
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
    </svg>
  );
}
