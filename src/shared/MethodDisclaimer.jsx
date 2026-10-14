/**
 * Methodological disclaimer, rendered in the UI itself — not buried in the
 * README. Both research-triage and author-mapping produce a ranking, and in
 * neither case does that ranking say anything about scientific quality.
 *
 * The one-line `summary` is always on screen, next to the numbers; the full
 * explanation opens on demand so it does not push the first action below the fold.
 */
import { useId, useState } from 'react';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';

/**
 * @param {{ title: string, summary: React.ReactNode, children: React.ReactNode }} props
 */
export default function MethodDisclaimer({ title, summary, children }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <aside
      role="note"
      aria-label={title}
      className="mb-5 flex gap-3 rounded-xl border border-solid border-[#F0D9AE] bg-[#FDF6E8] p-3 sm:p-4"
    >
      <svg
        viewBox="0 0 20 20"
        width="20"
        height="20"
        className="mt-0.5 shrink-0 text-[#B7791F]"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm1.3 9.2H8.7v-1.4h.6V10h-.6V8.6h2v4.7h.6v1.4Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <Typography variant="subtitle2" component="p" className="text-[#5C3D0E]">
          {title}
        </Typography>
        <Typography variant="body2" className="mt-0.5 text-[#5C3D0E]">
          {summary}
        </Typography>
        <Collapse in={open} id={bodyId}>
          <Typography variant="body2" className="mt-2 text-[#5C3D0E]">
            {children}
          </Typography>
        </Collapse>
        <Button
          size="small"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="-ml-2 mt-1 text-[#8A5A12]"
        >
          {open ? 'Show less' : 'Read the full explanation'}
        </Button>
      </div>
    </aside>
  );
}
