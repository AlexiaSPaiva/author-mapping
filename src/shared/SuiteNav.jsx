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
    repo: 'https://github.com/AlexiaSPaiva/research-triage',
  },
  {
    key: 'reading',
    name: 'Reading Versions',
    label: 'Reading',
    url: 'https://alexiaspaiva.github.io/reading-versions/',
    repo: 'https://github.com/AlexiaSPaiva/reading-versions',
  },
  {
    key: 'authors',
    name: 'Author Mapping',
    label: 'Authors',
    url: 'https://alexiaspaiva.github.io/author-mapping/',
    repo: 'https://github.com/AlexiaSPaiva/author-mapping',
  },
];

/** GitHub mark, inline so the header needs no icon package. */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', subtitle: string }} props
 */
export default function SuiteNav({ current, subtitle }) {
  const stage = STAGES.find((item) => item.key === current) ?? STAGES[0];

  return (
    <AppBar position="static" color="primary" elevation={0} className="relative overflow-hidden">
      {/* Decorative, and behind everything: pointer events are re-enabled on the
          cells themselves so the neurons stay clickable. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 sm:opacity-100"
        aria-hidden="true"
      >
        <NeuralNetwork current={current} stages={STAGES} />
      </div>
      {/* Keeps the title readable over the drawing on narrow screens. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b2233]/90 via-[#0b2233]/50 to-transparent"
        aria-hidden="true"
      />

      <a
        href={stage.repo}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white no-underline backdrop-blur hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <GitHubIcon />
        <span>Source</span>
      </a>

      {/* The drawing is cropped to fill (see preserveAspectRatio in
          NeuralNetwork); the header has to stay tall enough that the crop keeps
          the cell labels inside it. */}
      <Toolbar className="relative min-h-[9rem] flex-col items-start justify-center gap-2 py-5 sm:min-h-[10rem]">
        <div className="max-w-xl pr-20 sm:pr-0">
          <Typography
            variant="overline"
            component="p"
            className="leading-none text-[#F6C87A]"
            aria-label="litpipe suite"
          >
            litpipe · stage {STAGES.indexOf(stage) + 1} of {STAGES.length}
          </Typography>
          <Typography
            variant="h1"
            component="h1"
            className="mt-1 break-words text-white drop-shadow-[0_2px_10px_rgba(8,25,42,0.9)]"
          >
            {stage.name}
          </Typography>
          <Typography
            variant="body2"
            className="mt-1 break-words text-white/85 drop-shadow-[0_1px_8px_rgba(8,25,42,0.9)]"
          >
            {subtitle}
          </Typography>
        </div>

        <nav aria-label="litpipe pipeline">
          <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
            {STAGES.map((item, index) => (
              // On a narrow screen the drawing is cropped to a single cell, so
              // these pills carry the navigation; from `sm` up the neurons are
              // visible and clickable and the list steps back to screen
              // readers — reappearing on keyboard focus, since an invisible
              // focus ring is a trap.
              <li key={item.key} className="not-sr-only sm:sr-only sm:focus-within:not-sr-only">
                {item.key === current ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#0F2F44]"
                  >
                    {index + 1} · {item.label}
                  </span>
                ) : (
                  <a
                    href={item.url}
                    className="inline-flex items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 text-xs font-semibold text-white/90 no-underline hover:bg-white/10"
                  >
                    {index + 1} · {item.label}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </Toolbar>
    </AppBar>
  );
}
