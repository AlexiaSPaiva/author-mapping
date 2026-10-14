/**
 * A magnified chemical synapse, drawn like a schematic from a neuroscience
 * textbook and placed as a "lens" over one real synapse in the header chain.
 *
 * Everything that the timeline in NeuralNetwork.jsx animates has an id here, in
 * the order the events happen: the action potential depolarises the axon
 * terminal, voltage-gated Ca²⁺ channels open, a docked vesicle fuses with the
 * membrane, neurotransmitter crosses the synaptic cleft, binds to receptors in
 * the postsynaptic density, and the dendritic spine depolarises.
 *
 * Identical file in the three litpipe apps.
 */

/** Radius of the lens, in drawing units. */
export const LENS_RADIUS = 44;

/** Where the docked vesicle meets the membrane: release starts here. */
const FUSION = { x: -3, y: -6 };

const TERMINAL =
  'M-44 -52 L-36 -18 C-34 -10, -29 -6, -22 -6 L14 -6 C22 -6, 27 -10, 29 -18 L34 -52 Z';
const SPINE = 'M-34 52 C-36 30, -32 10, -22 5 L14 5 C24 6, 30 16, 25 27 C21 35, 15 40, 14 52 Z';

/** Vesicles in the reserve pool, plus two docked at the active zone. */
const POOL = [
  [-9, -31],
  [-1, -36],
  [7, -30],
  [15, -35],
  [-4, -23],
  [4, -21],
  [12, -24],
  [19, -18],
  [-13, -15],
  [21, -28],
];
const DOCKED = [
  [-3, -9.6],
  [8, -9.6],
];

/** Receptors sit in the postsynaptic density, across the cleft from release. */
const RECEPTORS = [-11, -6, -1, 4, 9];

/** Neurotransmitter molecules: start at the fusion pore, end on the receptors. */
export const TRANSMITTER = Array.from({ length: 14 }, (_value, index) => ({
  dx: RECEPTORS[index % RECEPTORS.length] - FUSION.x + ((index * 7) % 5) - 2,
  dy: 8.4 + ((index * 3) % 4) * 0.5,
}));

const CA_CHANNELS = [-15, 13];

/** Labels on both sides of the lens, each with a leader line to its structure. */
const LABELS = [
  { id: 'terminal', text: 'Axon terminal', side: -1, y: -32, to: [-31, -30] },
  { id: 'vesicles', text: 'Synaptic vesicles', side: -1, y: -18, to: [-13, -15] },
  { id: 'cleft', text: 'Synaptic cleft', side: -1, y: -1, to: [-24, 0] },
  { id: 'receptors', text: 'Receptors', side: -1, y: 13, to: [-11, 5] },
  { id: 'spine', text: 'Dendritic spine', side: -1, y: 28, to: [-29, 26] },
  { id: 'calcium', text: 'Ca²⁺ channels', side: 1, y: -12, to: [CA_CHANNELS[1] + 2, -7] },
  { id: 'transmitter', text: 'Neurotransmitter', side: 1, y: 6, to: [6, 0] },
];

/**
 * @param {{ cx: number, cy: number, target: { x: number, y: number } }} props
 *   cx, cy: centre of the lens; target: the synapse it magnifies.
 */
export default function SynapseInset({ cx, cy, target }) {
  // Callout: two lines from the small ring around the real synapse to the lens.
  const angle = Math.atan2(target.y - cy, target.x - cx);
  const perpendicular = angle + Math.PI / 2;
  const ring = 9;
  const ends = [1, -1].map((side) => ({
    x1: target.x + Math.cos(perpendicular) * ring * side,
    y1: target.y + Math.sin(perpendicular) * ring * side,
    x2: cx + Math.cos(angle + side * 0.55) * LENS_RADIUS,
    y2: cy + Math.sin(angle + side * 0.55) * LENS_RADIUS,
  }));

  return (
    <g className="synapse-inset">
      <g stroke="#8CCFF0" strokeOpacity="0.45" strokeWidth="0.6" fill="none" strokeDasharray="2 2">
        <circle cx={target.x} cy={target.y} r={ring} />
        {ends.map((line, index) => (
          <line key={index} {...line} />
        ))}
      </g>

      <g transform={`translate(${cx} ${cy})`}>
        <defs>
          <clipPath id="lens-clip">
            <circle r={LENS_RADIUS} />
          </clipPath>
        </defs>

        <circle r={LENS_RADIUS} fill="#061521" />
        <g clipPath="url(#lens-clip)">
          {/* Presynaptic side: the axon terminal. */}
          <path d={TERMINAL} fill="#113A52" stroke="#8CCFF0" strokeWidth="0.9" />
          <path id="syn-depol" d={TERMINAL} fill="#CFEFFF" opacity="0" filter="url(#glow)" />

          {/* A mitochondrion: terminals are full of them, release costs energy. */}
          <g transform="translate(-21 -32) rotate(-24)">
            <ellipse rx="8.5" ry="3.6" fill="#1A4F6B" stroke="#7FB8D6" strokeWidth="0.55" />
            <path
              d="M-5 -2.2 L-4 2.2 M-1.5 -2.6 L-0.5 2.6 M2 -2.6 L3 2.6 M5 -1.8 L5.6 1.8"
              stroke="#7FB8D6"
              strokeWidth="0.45"
            />
          </g>

          <g fill="#1C5C7C" stroke="#CDEBFA" strokeWidth="0.6">
            {POOL.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="3" />
            ))}
            {DOCKED.map(([x, y], index) => (
              <circle key={`docked-${index}`} id={`syn-dock-${index}`} cx={x} cy={y} r="3" />
            ))}
          </g>

          {/* Voltage-gated calcium channels in the active zone, and the ions. */}
          <g fill="#E8A33D">
            {CA_CHANNELS.map((x) => (
              <rect key={x} x={x - 1.3} y="-8.2" width="2.6" height="4.4" rx="0.8" />
            ))}
          </g>
          <g fill="#F6C87A">
            {CA_CHANNELS.flatMap((x) =>
              [-1.2, 1.4].map((offset) => (
                <circle
                  key={`${x}${offset}`}
                  className="syn-ca"
                  cx={x + offset}
                  cy={2 + Math.abs(offset)}
                  r="0.9"
                  opacity="0"
                />
              )),
            )}
          </g>

          {/* Postsynaptic side: a dendritic spine with its density and receptors. */}
          <path d={SPINE} fill="#0E3046" stroke="#8CCFF0" strokeWidth="0.9" />
          <path id="syn-epsp" d={SPINE} fill="#CFEFFF" opacity="0" filter="url(#glow)" />
          <path d="M-14 5.6 L10 5.6 L8.6 9.2 L-12.6 9.2 Z" fill="#5E9CC0" opacity="0.5" />
          <g id="syn-rec" fill="#9ED8F5" opacity="0.75">
            {RECEPTORS.map((x) => (
              <g key={x}>
                <rect x={x - 1.5} y="2.6" width="1.1" height="4.6" rx="0.4" />
                <rect x={x + 0.4} y="2.6" width="1.1" height="4.6" rx="0.4" />
              </g>
            ))}
          </g>

          <g fill="#FFE29A">
            {TRANSMITTER.map((molecule, index) => (
              <circle
                key={index}
                className="syn-nt"
                data-dx={molecule.dx}
                data-dy={molecule.dy}
                cx={FUSION.x}
                cy={FUSION.y}
                r="0.85"
                opacity="0"
              />
            ))}
          </g>
        </g>
        <circle
          r={LENS_RADIUS}
          fill="none"
          stroke="#8CCFF0"
          strokeOpacity="0.55"
          strokeWidth="0.8"
        />

        <text
          y={LENS_RADIUS + 9}
          textAnchor="middle"
          fontSize="6.4"
          fontWeight="700"
          letterSpacing="0.6"
          fill="#F6C87A"
        >
          SYNAPSE, MAGNIFIED
        </text>

        {LABELS.map((label) => {
          const textX = label.side * (LENS_RADIUS + 8);
          return (
            <g key={label.id} id={`lab-${label.id}`} opacity="0.55">
              <path
                d={`M${textX + label.side * -1} ${label.y - 2} L${label.side * LENS_RADIUS * 0.96} ${label.y - 2} L${label.to[0]} ${label.to[1]}`}
                fill="none"
                stroke="#D7EEF9"
                strokeWidth="0.4"
              />
              <text
                x={textX}
                y={label.y}
                textAnchor={label.side < 0 ? 'end' : 'start'}
                fontSize="6.6"
                fontWeight="500"
                letterSpacing="0.2"
                fill="#D7EEF9"
              >
                {label.text}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}
