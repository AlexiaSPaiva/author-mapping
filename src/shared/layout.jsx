/**
 * Layout pieces shared by the three litpipe apps (identical file in each repo):
 * numbered sections that show the order of work, empty states that say what to
 * do next, the "try an example" invitation and the suite footer.
 */
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { STAGES } from './SuiteNav.jsx';

/**
 * A card with a numbered heading. The number is the order of work on the page,
 * so a first-time visitor can see where to start.
 *
 * @param {{ step?: number, id: string, title: string, description?: React.ReactNode,
 *   actions?: React.ReactNode, children?: React.ReactNode, className?: string }} props
 */
export function Section({ step, id, title, description, actions, children, className = '' }) {
  return (
    <Paper component="section" aria-labelledby={id} className={`p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {step !== undefined && (
            <span
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1B4965] text-sm font-bold text-white"
              aria-hidden="true"
            >
              {step}
            </span>
          )}
          <div className="min-w-0">
            <Typography id={id} variant="h2" component="h2">
              {step !== undefined && <span className="sr-only">Step {step}: </span>}
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" className="mt-0.5">
                {description}
              </Typography>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Paper>
  );
}

/**
 * What an empty area is for and what to do about it.
 *
 * @param {{ icon?: React.ReactNode, title: string, children?: React.ReactNode,
 *   action?: React.ReactNode, compact?: boolean }} props
 */
export function EmptyState({ icon, title, children, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-[#CBD6E0] bg-[#F8FAFC] text-center ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}
    >
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#E3EEF6] text-[#1B4965]">
          {icon}
        </div>
      )}
      <Typography variant="subtitle1" component="p">
        {title}
      </Typography>
      {children && (
        <Typography variant="body2" color="text.secondary" className="mt-1 max-w-md">
          {children}
        </Typography>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Shown while the app is empty: a visitor can see it working in one click
 * instead of having to bring their own data first.
 *
 * @param {{ onLoad: () => void, children: React.ReactNode }} props
 */
export function ExampleBanner({ onLoad, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-solid border-[#C9DDEB] bg-[#EAF3F9] p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Typography variant="subtitle2" component="p" className="text-[#0F2F44]">
          New here?
        </Typography>
        <Typography variant="body2" className="text-[#24435A]">
          {children}
        </Typography>
      </div>
      <Button variant="contained" onClick={onLoad} className="shrink-0">
        Load an example
      </Button>
    </div>
  );
}

/** @param {{ current: string, note: React.ReactNode }} props */
export function SuiteFooter({ current, note }) {
  const stage = STAGES.find((item) => item.key === current) ?? STAGES[0];
  return (
    <footer className="mt-10 border-0 border-t border-solid border-[#DFE7EE] pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography variant="body2" className="font-semibold">
            litpipe
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" className="max-w-xl">
            {note}
          </Typography>
        </div>
        <nav aria-label="litpipe apps and source">
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
            {STAGES.map((item, index) => (
              <li key={item.key}>
                {item.key === current ? (
                  <span className="font-semibold" aria-current="page">
                    {index + 1}. {item.name}
                  </span>
                ) : (
                  <a href={item.url} className="text-[#1B4965]">
                    {index + 1}. {item.name}
                  </a>
                )}
              </li>
            ))}
            <li>
              <a href={stage.repo} className="text-[#1B4965]">
                Source on GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <Typography variant="caption" color="text.secondary" component="p" className="mt-3">
        Built by{' '}
        <a href="https://github.com/AlexiaSPaiva" className="text-[#1B4965]">
          Alexia Paiva
        </a>
        .
      </Typography>
    </footer>
  );
}

/** Small line icons for empty states (24×24, stroke = currentColor). */
export const icons = {
  document: (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </svg>
  ),
  ranking: (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 19V10M12 19V5M19 19v-6" />
    </svg>
  ),
  history: (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4.5h4.5M12 7.5V12l3 2" />
    </svg>
  ),
  people: (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M15 14.6c2.4 0 4.1 1.5 4.6 4.4" />
    </svg>
  ),
};
