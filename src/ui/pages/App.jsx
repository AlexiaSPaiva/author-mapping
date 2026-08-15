import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import {
  GROUPINGS,
  coauthorshipEdges,
  filterAuthors,
  groupAuthors,
  summariseAuthors,
} from '../../domain/grouping.js';
import { createProfile, profileToQuery, validateProfile } from '../../shared/researchProfile.js';
import MethodDisclaimer from '../../shared/MethodDisclaimer.jsx';
import SuiteNav from '../../shared/SuiteNav.jsx';
import { downloadText, toCsv } from '../../services/fileIo.js';
import { fetchWorks } from '../../services/openalex.js';
import { loadJson, saveJson } from '../../services/storage.js';
import AuthorGroups from '../components/AuthorGroups.jsx';
import CoauthorGraph from '../components/CoauthorGraph.jsx';
import ProfileEditor from '../components/ProfileEditor.jsx';

const STORAGE_KEY = 'litpipe.author-mapping.v1';

/**
 * Read from the environment so no email address is committed. Documented in the
 * README and in .env.example; without it the app still works, on OpenAlex's
 * common request pool instead of its polite one.
 */
const MAILTO = import.meta.env.VITE_OPENALEX_MAILTO ?? '';

/** The current year, captured once so grouping stays stable during a session. */
const THIS_YEAR = new Date().getFullYear();

function loadSession() {
  const stored = loadJson(STORAGE_KEY, null);
  const validated = validateProfile(stored?.profile);
  return validated.ok ? validated.profile : createProfile();
}

export default function App() {
  const [profile, setProfile] = useState(loadSession);
  const [works, setWorks] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: null, notice: null });
  const [criterion, setCriterion] = useState('volume');
  const [minWorks, setMinWorks] = useState(2);
  const [fromYear, setFromYear] = useState('');
  const [query, setQuery] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    saveJson(STORAGE_KEY, { profile });
  }, [profile]);

  // Abort an in-flight request if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const authors = useMemo(() => summariseAuthors(works), [works]);
  const filtered = useMemo(
    () =>
      filterAuthors(authors, { minWorks, query, activeSince: fromYear ? Number(fromYear) : null }),
    [authors, minWorks, query, fromYear],
  );
  const { edges, skippedWorks } = useMemo(
    () => coauthorshipEdges(works, new Set(filtered.map((author) => author.id))),
    [works, filtered],
  );
  const groups = useMemo(() => groupAuthors(filtered, criterion, THIS_YEAR), [filtered, criterion]);

  const search = async () => {
    const searchText = profileToQuery(profile);
    if (searchText.trim().length < 3) {
      setStatus({ loading: false, error: 'Fill in the research topic first.', notice: null });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({ loading: true, error: null, notice: null });

    try {
      const result = await fetchWorks(searchText, {
        mailto: MAILTO,
        fromYear: fromYear ? Number(fromYear) : null,
        signal: controller.signal,
      });
      if (result.error) {
        setStatus({ loading: false, error: result.error, notice: null });
        return;
      }

      setWorks(result.works);
      setStatus({
        loading: false,
        error: null,
        notice:
          `Found ${result.works.length} works of ${result.totalAvailable.toLocaleString('en-GB')} matching in OpenAlex` +
          (result.fromCache ? ' (from local cache — no request was made).' : '.'),
      });
    } catch (error) {
      // An abort is the user searching again, not a failure worth reporting.
      if (error.name !== 'AbortError') {
        setStatus({ loading: false, error: 'Unexpected error while searching.', notice: null });
      }
    }
  };

  const exportCsv = () => {
    downloadText(
      'litpipe-authors.csv',
      toCsv(
        [
          'name',
          'openalex_id',
          'orcid',
          'works_in_set',
          'citations_in_set',
          'institution',
          'country',
          'first_year',
          'last_year',
        ],
        filtered.map((author) => [
          author.name,
          author.id,
          author.orcid ?? '',
          author.worksCount,
          author.citationsTotal,
          author.institution,
          author.country,
          author.firstYear ?? '',
          author.lastYear ?? '',
        ]),
      ),
      'text/csv',
    );
  };

  return (
    <>
      <SuiteNav
        current="authors"
        subtitle="Find and group the people publishing on your topic, from OpenAlex"
      />

      <Container maxWidth="lg" component="main" className="py-6">
        <MethodDisclaimer title="What “relevant author” means here — and what it does not">
          Every ranking on this page is <strong>bibliometric</strong>: how many papers an author has
          in the search results, how often those papers are cited, who they publish with, and when
          they were active.{' '}
          <strong>None of it measures the quality of anyone&apos;s science.</strong> Volume and
          citation counts carry well-documented biases towards English-language work, towards
          wealthy countries and well-funded institutions, towards long careers over early-career
          researchers, and towards fields that cite densely. Use this to find who to read and who to
          write to — never to judge who is a good researcher.
        </MethodDisclaimer>

        <div className="flex flex-col gap-5">
          <ProfileEditor profile={profile} onChange={setProfile} />

          <Paper component="section" aria-labelledby="search-heading" className="p-4 sm:p-5">
            <Typography id="search-heading" variant="h2" component="h2" className="mb-3">
              Search and grouping
            </Typography>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                select
                label="Group authors by"
                value={criterion}
                onChange={(event) => setCriterion(event.target.value)}
                size="small"
                fullWidth
              >
                {Object.entries(GROUPINGS).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Published from year"
                type="number"
                value={fromYear}
                onChange={(event) => setFromYear(event.target.value)}
                size="small"
                fullWidth
                inputProps={{ min: 1900, max: THIS_YEAR }}
                helperText="Optional; applies to the OpenAlex query"
              />

              <TextField
                label="Filter by name or institution"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="small"
                fullWidth
              />

              <div>
                <Typography
                  variant="caption"
                  component="label"
                  htmlFor="min-works"
                  color="text.secondary"
                >
                  Minimum works in this topic: {minWorks}
                </Typography>
                <Slider
                  id="min-works"
                  value={minWorks}
                  onChange={(_event, value) => setMinWorks(value)}
                  min={1}
                  max={10}
                  marks
                  step={1}
                  aria-label="Minimum works in this topic"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="contained" onClick={search} disabled={status.loading}>
                {status.loading ? 'Searching…' : 'Search OpenAlex'}
              </Button>
              <Button
                variant="outlined"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                title="Downloads the filtered authors as a CSV file"
              >
                Export CSV ({filtered.length})
              </Button>
              {status.loading && <CircularProgress size={20} aria-label="Searching" />}
            </div>

            {status.error && (
              <Alert severity="error" className="mt-3">
                {status.error}
              </Alert>
            )}
            {status.notice && !status.error && (
              <Alert severity="info" className="mt-3">
                {status.notice}
              </Alert>
            )}
          </Paper>

          {works.length > 0 && (
            <>
              <CoauthorGraph authors={filtered} edges={edges} skippedWorks={skippedWorks} />

              <section aria-labelledby="groups-heading">
                <Typography id="groups-heading" variant="h2" component="h2" className="mb-3">
                  {filtered.length} author{filtered.length === 1 ? '' : 's'} in {groups.length}{' '}
                  group
                  {groups.length === 1 ? '' : 's'}
                </Typography>
                {filtered.length === 0 ? (
                  <Paper className="p-6 text-center">
                    <Typography color="text.secondary">
                      No author matches these filters. Try lowering the minimum works.
                    </Typography>
                  </Paper>
                ) : (
                  <AuthorGroups groups={groups} allAuthors={filtered} edges={edges} />
                )}
              </section>
            </>
          )}

          {works.length === 0 && !status.loading && (
            <Paper className="p-8 text-center">
              <Typography color="text.secondary">
                Describe your topic above, then search OpenAlex to see who publishes on it.
              </Typography>
            </Paper>
          )}
        </div>

        <Typography
          variant="caption"
          color="text.secondary"
          component="footer"
          className="mt-8 block"
        >
          Stage 3 of 3 of litpipe · data from{' '}
          <a href="https://openalex.org" target="_blank" rel="noopener noreferrer">
            OpenAlex
          </a>{' '}
          (CC0) · bibliometric counts, not quality measures ·{' '}
          <a href="https://github.com/AlexiaSPaiva/author-mapping">source</a>
        </Typography>
      </Container>
    </>
  );
}
