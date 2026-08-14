/**
 * Methodological disclaimer, rendered in the UI itself — not buried in the
 * README. Both research-triage and author-mapping produce a ranking, and in
 * neither case does that ranking say anything about scientific quality. The
 * user of this tool must read that on screen, next to the numbers.
 */
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

/**
 * @param {{ title: string, children: React.ReactNode }} props
 */
export default function MethodDisclaimer({ title, children }) {
  return (
    <Alert severity="info" variant="outlined" role="note" className="mb-4">
      <AlertTitle>{title}</AlertTitle>
      {children}
    </Alert>
  );
}
