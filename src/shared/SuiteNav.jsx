/**
 * Header shared by the three litpipe apps: it names the pipeline and marks which
 * stage the user is currently in. Identical file in all three repos, with only
 * the `current` prop differing — that is what makes them read as one suite
 * rather than three unrelated pages.
 *
 * The pipeline is drawn as living tissue (see NeuralNetwork.jsx); this file owns
 * the text over it and the links a keyboard can reach.
 */
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

import NeuralNetwork from './NeuralNetwork.jsx';

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

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', subtitle: string }} props
 */
export default function SuiteNav({ current, subtitle }) {
  const stage = STAGES.find((item) => item.key === current) ?? STAGES[0];

  return (
    <AppBar position="static" color="primary" elevation={0} className="relative overflow-hidden">
      {/* Decorative, and behind everything: pointer events are re-enabled on the
          cells themselves so the neurons stay clickable. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <NeuralNetwork current={current} stages={STAGES} />
      </div>

      {/* The drawing is cropped to fill (see preserveAspectRatio in
          NeuralNetwork); the header has to stay tall enough that the crop keeps
          the cell labels inside it. */}
      <Toolbar className="relative min-h-[9rem] flex-col items-start justify-center gap-1 py-5 sm:min-h-[10rem]">
        <div className="max-w-xl">
          <Typography
            variant="overline"
            component="p"
            className="leading-none text-white/70"
            aria-label="litpipe suite"
          >
            litpipe
          </Typography>
          <Typography
            variant="h1"
            component="h1"
            className="break-words text-white drop-shadow-[0_2px_10px_rgba(8,25,42,0.9)]"
          >
            {stage.name}
          </Typography>
          <Typography
            variant="body2"
            className="break-words text-white/85 drop-shadow-[0_1px_8px_rgba(8,25,42,0.9)]"
          >
            {subtitle}
          </Typography>
        </div>

        <nav aria-label="litpipe pipeline" className="mt-1">
          <ol className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0">
            {STAGES.map((item, index) => (
              // On a narrow screen the drawing is cropped to a single cell, so
              // the links carry the navigation; from `sm` up the neurons are
              // visible and clickable and the list steps back to screen
              // readers — reappearing on keyboard focus, since an invisible
              // focus ring is a trap.
              <li key={item.key} className="not-sr-only sm:sr-only sm:focus-within:not-sr-only">
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
                    className="text-xs opacity-90 hover:opacity-100"
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
