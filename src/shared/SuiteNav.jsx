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

/** The pipeline, in order. Stage order is the product, so it lives in one place. */
export const STAGES = [
  { key: 'triage', label: '1 · Screening', url: 'https://alexiaspaiva.github.io/research-triage/' },
  { key: 'reading', label: '2 · Reading', url: 'https://alexiaspaiva.github.io/reading-versions/' },
  { key: 'authors', label: '3 · Authors', url: 'https://alexiaspaiva.github.io/author-mapping/' },
];

/**
 * @param {{ current: 'triage' | 'reading' | 'authors', title: string, subtitle: string }} props
 */
export default function SuiteNav({ current, title, subtitle }) {
  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h1" component="h1" className="text-white">
            {title}
          </Typography>
          <Typography variant="body2" className="text-white/80">
            {subtitle}
          </Typography>
        </div>

        <nav aria-label="litpipe suite">
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 p-0 m-0 list-none">
            {STAGES.map((stage, index) => (
              <li key={stage.key} className="flex items-center">
                {index > 0 && (
                  <span aria-hidden="true" className="mx-1 text-white/50">
                    →
                  </span>
                )}
                {stage.key === current ? (
                  <span
                    aria-current="page"
                    className="rounded-md bg-white/20 px-2 py-1 text-sm font-semibold text-white"
                  >
                    {stage.label}
                  </span>
                ) : (
                  <Link
                    href={stage.url}
                    underline="hover"
                    className="rounded-md px-2 py-1 text-sm text-white/85 hover:text-white"
                  >
                    {stage.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Toolbar>
    </AppBar>
  );
}
