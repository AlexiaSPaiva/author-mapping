/**
 * The grouped author list. A real table, not the graph, is the accessible and
 * printable view of the same data — the graph is the summary, this is the record.
 */
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { recurringCoauthors } from '../../domain/grouping.js';

/**
 * @param {{
 *   groups: { label: string, authors: import('../../domain/grouping.js').AuthorSummary[] }[],
 *   allAuthors: import('../../domain/grouping.js').AuthorSummary[],
 *   edges: { source: string, target: string, weight: number }[],
 * }} props
 */
export default function AuthorGroups({ groups, allAuthors, edges }) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, index) => (
        <Accordion key={group.label} defaultExpanded={index === 0} disableGutters>
          <AccordionSummary aria-controls={`group-${index}`} id={`group-header-${index}`}>
            <Typography variant="subtitle1" component="h3" className="font-semibold">
              {group.label}
            </Typography>
            <Chip label={group.authors.length} size="small" className="ml-2" />
          </AccordionSummary>
          <AccordionDetails id={`group-${index}`}>
            <TableContainer className="overflow-x-auto">
              <Table size="small" aria-label={`Authors in ${group.label}`}>
                <TableHead>
                  <TableRow>
                    <TableCell>Author</TableCell>
                    <TableCell align="right">Works</TableCell>
                    <TableCell align="right">Citations</TableCell>
                    <TableCell>Institution</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>Recurring co-authors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.authors.map((author) => {
                    const collaborators = recurringCoauthors(author.id, edges, allAuthors);
                    return (
                      <TableRow key={author.id} hover>
                        <TableCell>
                          <Link
                            href={author.id}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                          >
                            {author.name}
                          </Link>
                          {author.orcid && (
                            <Link
                              href={author.orcid}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs"
                              underline="hover"
                            >
                              ORCID
                            </Link>
                          )}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                          {author.worksCount}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                          {author.citationsTotal.toLocaleString('en-GB')}
                        </TableCell>
                        <TableCell>
                          {author.institution || '—'}
                          {author.country ? ` (${author.country})` : ''}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {author.firstYear ? `${author.firstYear}–${author.lastYear}` : '—'}
                        </TableCell>
                        <TableCell>
                          {collaborators.length === 0 ? (
                            '—'
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {collaborators.slice(0, 3).map((coauthor) => (
                                <Chip
                                  key={coauthor.id}
                                  label={`${coauthor.name} ×${coauthor.weight}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {collaborators.length > 3 && (
                                <Chip label={`+${collaborators.length - 3}`} size="small" />
                              )}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
