import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import MethodDisclaimer from '../../shared/MethodDisclaimer.jsx';
import SuiteNav from '../../shared/SuiteNav.jsx';

/**
 * App shell. The screens are added on top of this; what is here is what every
 * later version keeps: the suite header, and the disclaimer that has to sit next
 * to any author ranking this app produces.
 */
export default function App() {
  return (
    <>
      <SuiteNav
        current="authors"
        title="author-mapping"
        subtitle="Find and group the people publishing on your topic, from OpenAlex"
      />

      <Container maxWidth="lg" component="main" className="py-6">
        <MethodDisclaimer title="What “relevant author” means here — and what it does not">
          Rankings in this app are <strong>bibliometric</strong>: counts of works, citations,
          co-authorship and years of activity.{' '}
          <strong>None of it measures the quality of anyone&apos;s science.</strong>
        </MethodDisclaimer>

        <Paper className="p-6 text-center">
          <Typography color="text.secondary">Screens are not wired up yet.</Typography>
        </Paper>
      </Container>
    </>
  );
}
