/**
 * Header shared by the three litpipe apps: it names the pipeline and marks which
 * stage the user is currently in. Identical file in all three repos, with only
 * the `current` prop differing — that is what makes them read as one suite
 * rather than three unrelated pages.
 */
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

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

/** Numbered pill, one per stage. The current one is filled, the others are links. */
function StageLink({ stage, index, isCurrent }) {
  const number = (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isCurrent ? 'bg-white text-[#1B4965]' : 'bg-white/20 text-white'
      }`}
    >
      {index + 1}
    </span>
  );

  const content = (
    <>
      {number}
      <span className="text-sm font-semibold">{stage.label}</span>
    </>
  );

  return isCurrent ? (
    <span
      aria-current="page"
      className="flex items-center gap-1.5 rounded-full bg-white/20 py-1 pl-1 pr-3 text-white"
    >
      {content}
    </span>
  ) : (
    <Link
      href={stage.url}
      // color="inherit" picks up the AppBar's contrast text. A Tailwind text
      // colour here loses to MUI's own class in the cascade, which rendered
      // these links invisible: dark blue on the dark blue bar. Colour is a
      // component concern, so MUI owns it — see the styling boundary in README.
      color="inherit"
      underline="none"
      title={`Go to ${stage.name}`}
      className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 opacity-80 hover:bg-white/10 hover:opacity-100"
    >
      {content}
    </Link>
  );
}

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', subtitle: string }} props
 */
export default function SuiteNav({ current, subtitle }) {
  const stage = STAGES.find((item) => item.key === current) ?? STAGES[0];

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

        <nav aria-label="litpipe pipeline" className="shrink-0">
          <ol className="m-0 flex flex-wrap items-center gap-x-1 gap-y-1 p-0 list-none">
            {STAGES.map((item, index) => (
              <li key={item.key} className="flex items-center">
                {index > 0 && (
                  <span aria-hidden="true" className="mx-1 text-white/40">
                    →
                  </span>
                )}
                <StageLink stage={item} index={index} isCurrent={item.key === current} />
              </li>
            ))}
          </ol>
        </nav>
      </Toolbar>
    </AppBar>
  );
}
