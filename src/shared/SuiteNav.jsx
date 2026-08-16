/**
 * Header shared by the three litpipe apps: it names the pipeline and marks which
 * stage the user is currently in. Identical file in all three repos, with only
 * the `current` prop differing — that is what makes them read as one suite
 * rather than three unrelated pages.
 *
 * The pipeline is drawn as a chain of neurons: each stage is a cell body, and
 * what one stage hands to the next (a selection, a library) crosses a synaptic
 * cleft as vesicles. The metaphor is the product — data only ever travels
 * forward, one stage at a time, and nothing crosses without being released.
 */
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * The pipeline, in order. Stage order and the display name of each app are the
 * product, so they live in one place: the repo slugs (research-triage) stay in
 * the URLs, the reader only ever sees the spelled-out name (Research Triage).
 */
export const STAGES = [
  {
    key: 'triage',
    name: 'Research Triage',
    label: 'Screening',
    url: 'https://alexiaspaiva.github.io/research-triage/',
  },
  {
    key: 'reading',
    name: 'Reading Versions',
    label: 'Reading',
    url: 'https://alexiaspaiva.github.io/reading-versions/',
  },
  {
    key: 'authors',
    name: 'Author Mapping',
    label: 'Authors',
    url: 'https://alexiaspaiva.github.io/author-mapping/',
  },
];

/** Geometry of the drawing, in viewBox units. One place to retune the spacing. */
const CELL = { radius: 15, gap: 152, firstX: 34, y: 34 };
const VESICLES = [0, 1, 2];

/** x of the cell body of stage `index`. */
const cellX = (index) => CELL.firstX + index * CELL.gap;

/**
 * One neuron: dendrites reaching back towards the previous stage, a soma
 * carrying the stage number, and an axon leaving towards the next one.
 */
function Neuron({ index, stage, isCurrent }) {
  const x = cellX(index);
  const { y, radius } = CELL;

  return (
    <g>
      {/* Dendrites — the inputs this stage accepts (documents, or the stage before). */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.55}>
        <path d={`M${x - radius} ${y} l-9 -8`} fill="none" />
        <path d={`M${x - radius} ${y} l-11 0`} fill="none" />
        <path d={`M${x - radius} ${y} l-9 8`} fill="none" />
      </g>

      {isCurrent && (
        <circle cx={x} cy={y} r={radius + 5} fill="currentColor" opacity={0.18}>
          {/* A cell that is firing, as opposed to one merely wired up. */}
          <animate
            attributeName="r"
            values={`${radius + 3};${radius + 7};${radius + 3}`}
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={isCurrent ? '#FFFFFF' : 'transparent'}
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={isCurrent ? 1 : 0.65}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="700"
        fill={isCurrent ? '#1B4965' : 'currentColor'}
        opacity={isCurrent ? 1 : 0.85}
      >
        {index + 1}
      </text>
      <text
        x={x}
        y={y + radius + 16}
        textAnchor="middle"
        fontSize="11"
        fontWeight={isCurrent ? 700 : 500}
        fill="currentColor"
        opacity={isCurrent ? 1 : 0.75}
      >
        {stage.label}
      </text>
    </g>
  );
}

/**
 * The axon and the cleft between two stages. The vesicles only travel while the
 * pipeline is live for the reader — motion is suppressed when the system asks
 * for it.
 */
function Synapse({ index, animated }) {
  const from = cellX(index) + CELL.radius;
  const to = cellX(index + 1) - CELL.radius - 11;
  const { y } = CELL;
  const terminal = to - 12;

  return (
    <g>
      {/* Axon, ending in the bulb that holds the vesicles. */}
      <path
        d={`M${from + 3} ${y} H${terminal}`}
        stroke="currentColor"
        strokeWidth="2"
        opacity={0.4}
        fill="none"
      />
      <path
        d={`M${terminal} ${y - 7} q12 7 0 14 z`}
        fill="currentColor"
        opacity={0.4}
        stroke="none"
      />

      {/* Vesicles crossing the cleft, one after the other. */}
      {VESICLES.map((vesicle) => (
        <circle
          key={vesicle}
          cx={animated ? terminal + 4 : terminal + 4 + vesicle * 5}
          cy={y}
          r="2.2"
          fill="#5FA8D3"
        >
          {animated && (
            <>
              <animate
                attributeName="cx"
                values={`${terminal + 4};${to + 9}`}
                dur="1.8s"
                begin={`${vesicle * 0.6}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="1.8s"
                begin={`${vesicle * 0.6}s`}
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      ))}
    </g>
  );
}

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', subtitle: string }} props
 */
export default function SuiteNav({ current, subtitle }) {
  const stage = STAGES.find((item) => item.key === current) ?? STAGES[0];
  // Respect the OS setting: a header that pulses forever is a real problem for
  // vestibular disorders, and the diagram reads the same standing still.
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const width = cellX(STAGES.length - 1) + CELL.radius + 24;

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <Typography
            variant="overline"
            component="p"
            className="leading-none text-white/70"
            aria-label="litpipe suite"
          >
            litpipe
          </Typography>
          <Typography variant="h1" component="h1" className="break-words text-white">
            {stage.name}
          </Typography>
          <Typography variant="body2" className="break-words text-white/80">
            {subtitle}
          </Typography>
        </div>

        <nav aria-label="litpipe pipeline" className="w-full shrink-0 sm:w-auto">
          {/* The drawing is decorative; the links below carry the meaning. */}
          <svg
            viewBox={`0 0 ${width} 72`}
            className="h-16 w-full max-w-[26rem] text-white sm:w-[26rem]"
            aria-hidden="true"
            focusable="false"
          >
            {STAGES.slice(0, -1).map((item, index) => (
              <Synapse key={`synapse-${item.key}`} index={index} animated={!reduceMotion} />
            ))}
            {STAGES.map((item, index) =>
              item.key === current ? (
                <Neuron key={item.key} index={index} stage={item} isCurrent />
              ) : (
                // Clickable with a pointer; the keyboard path is the list below,
                // so this one stays out of the tab order.
                <a key={item.key} href={item.url} tabIndex={-1} className="cursor-pointer">
                  <Neuron index={index} stage={item} isCurrent={false} />
                </a>
              ),
            )}
          </svg>

          <ol className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0">
            {STAGES.map((item, index) => (
              // Hidden while the drawing says the same thing, but revealed on
              // keyboard focus: an invisible focus ring is a trap.
              <li key={item.key} className="sr-only focus-within:not-sr-only">
                {item.key === current ? (
                  <span aria-current="page" className="text-xs font-semibold text-white">
                    {index + 1}. {item.name} (you are here)
                  </span>
                ) : (
                  <Link
                    href={item.url}
                    // color="inherit" picks up the AppBar's contrast text. A
                    // Tailwind text colour here loses to MUI's own class in the
                    // cascade, which rendered these links invisible: dark blue
                    // on the dark blue bar. Colour is a component concern, so
                    // MUI owns it — see the styling boundary in the README.
                    color="inherit"
                    underline="hover"
                    className="text-xs opacity-80 hover:opacity-100"
                  >
                    {index + 1}. {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </Toolbar>
    </AppBar>
  );
}
