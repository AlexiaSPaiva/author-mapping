# author-mapping

[![CI](https://github.com/AlexiaSPaiva/author-mapping/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexiaSPaiva/author-mapping/actions/workflows/ci.yml)

**▶ Live app: https://alexiaspaiva.github.io/author-mapping/**

Find out who publishes on your topic. Searches [OpenAlex](https://openalex.org) from your research profile, groups the authors it finds by criteria you choose, and draws their co-authorship network.

> **Stage 3 of 3 — litpipe**
> [screening](https://github.com/AlexiaSPaiva/research-triage) → [reading](https://github.com/AlexiaSPaiva/reading-versions) → **author mapping (you are here)**

---

## The problem this solves

Halfway into a literature review I could list the papers I had read but not the *people* behind them — who the recurring names were, which groups they belonged to, who kept publishing together, and who was still active versus who had moved on a decade ago.

That matters for practical decisions: whose back catalogue to read next, who to cite, whose new work to follow, and who I could reasonably write to with a question.

## What it does

- Takes the same **research profile** as the other two litpipe apps and uses it as the OpenAlex query.
- Fetches matching works and **aggregates them into authors** — keyed by OpenAlex author id, not by name.
- **Groups authors** by publication volume in the topic, institution, country, or period of activity. The criterion is a dropdown, and every group shows its size.
- Draws a **co-authorship network** as inline SVG: circle size is works in the result set, line thickness is works co-authored together, hovering isolates one author's collaborators.
- Lists every author in a **table** with works, citations, affiliation, active years and recurring co-authors — the accessible and printable view of the same data.
- **Exports the author list as CSV.**
- Shows you **the exact request URL** it sent, because the output depends entirely on what was asked for.

## What "relevant author" means here — and what it does not

Stated in the app's interface as well as here, because it is the part most easily misread:

Every ranking on this page is **bibliometric**. It counts papers in the result set, citations of those papers, co-authorship links, and years of activity. **None of it measures the quality of anyone's science.**

Volume and citation metrics carry well-documented biases: towards English-language publication, towards authors in wealthy countries and well-funded institutions, towards long careers over early-career researchers, and towards fields with dense citation habits. A researcher doing excellent work in Portuguese on a small budget will rank below a prolific author in a large consortium — that is a property of the metric, not a finding about either of them.

Two further caveats specific to how this tool counts:

- **"Works" means works in your search results**, not an author's total output. Someone with three hundred papers who has two on your topic shows as 2.
- **Citations are of the works in the set**, summed. This is not an h-index and is not comparable across searches.

Use this to decide who to read and who to contact. Not to judge who is good.

## Data source

[**OpenAlex**](https://openalex.org) — free, no API key, CC0-licensed metadata.

The deciding factor over the alternatives was **disambiguated author identifiers**. Crossref returns author names as strings, which means two people called J. Smith merge into one and one person spelled two ways splits into two; author mapping built on name strings is built on sand. Scopus and Web of Science have proper identifiers but require a paid institutional key, which would make this app impossible to demonstrate to anyone without one.

**Being a polite client:**

- OpenAlex asks callers to identify themselves with a `mailto` parameter and routes those requests through a faster, more reliable pool. This app reads that address from an environment variable — see below — so no email address is committed to a public repository. Without it the app still works, on the common pool, and says so in the UI.
- Only the five fields the app uses are requested (`select=…`), which is roughly a tenth of a full work record.
- Responses are **cached in `localStorage` for 7 days**, keyed by the full request URL. Adjusting filters or re-running the same search costs zero requests. The cache is capped at 20 searches and can be cleared from the UI.
- **HTTP 429 (rate limited)** is reported in plain language, telling the user to wait and pointing out that earlier searches are still available from the cache. There is no automatic retry loop — hammering a free service that just asked you to stop is not politeness.
- Network failure, non-200 responses and unparseable JSON each produce a distinct, readable message rather than a stack trace or a blank screen.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_OPENALEX_MAILTO` | No | Email address sent to OpenAlex as `mailto`, which puts requests in their faster "polite pool". Unset, the app uses the common pool. |

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored. There are no secrets in this project — an email address in a request is not a credential — but it is also not something to commit to a public repo, which is why it is a variable rather than a constant.

## The co-authorship graph

Drawn with **inline SVG and no charting library**. All geometry lives in `src/domain/layout.js` as pure functions, so it is unit-tested and the component only renders.

The layout is a **circle**, not a force-directed simulation. That was a deliberate trade:

- A force-directed graph is ~200 lines of physics — repulsion, spring forces, a cooling schedule, collision handling — whose output shifts between runs and which I could not defend line by line in an interview. A graph library would be a heavy dependency for one view.
- A circular layout is deterministic, needs no simulation, and answers the questions I actually have: who is in the field, who is connected to whom, and which ties are strongest. Nodes are ordered by volume so the busiest authors sit adjacent and their shared arcs stay short.
- Edges are quadratic Bézier curves bowed towards the centre, so a dense graph stays readable instead of collapsing into overlapping chords through the middle.
- Node radius and edge width use square-root scales, so one prolific author or one heavy collaboration does not swamp everything else.

The canvas is wider than it is tall, because labels sit outside the ring and read horizontally: a square canvas clipped the leftmost and rightmost names.

**What the circle costs:** it does not reveal cluster structure the way a force-directed layout can. If clustering ever became the question, that is when the extra complexity would earn its place.

## Architecture decisions

| Decision | Why |
| --- | --- |
| **OpenAlex, not Crossref or Scopus** | Disambiguated author ids, free, no key. See *Data source*. |
| **No backend** | The API is public, CORS-enabled and needs no key, so a server would exist only to forward requests — adding a deployment, a failure mode and a rate limit of its own while removing nothing from the client. |
| **Authors keyed by OpenAlex id, never by name** | Name-keying both merges distinct people and splits single ones. This is the difference between a useful map and a plausible-looking wrong one. |
| **Circular SVG layout, not force-directed, not a graph library** | See above. |
| **Consortium papers excluded from the graph** | A work with more than 25 listed authors would contribute a fully connected clique — one 400-author paper is ~80,000 pairs — hiding the real structure. The count of excluded works is shown in the UI rather than applied silently. |
| **`referenceYear` passed in, not read from the clock** | The activity grouping takes the current year as an argument, which is what makes it deterministic and unit-testable. |
| **Cache keyed by full request URL** | Two searches differing only by year filter are different queries and must not share a cache entry. |
| **MUI for components, Tailwind for layout** | Both are in the stack, and using both for the same job would mean two systems fighting over one element. MUI owns components and brings keyboard and screen-reader behaviour; Tailwind owns spacing and layout. Tailwind's preflight is disabled so MUI's `CssBaseline` is the single reset. |
| **`shared/researchProfile.js` copied, not published** | Byte-identical in all three repos. An npm package for three consumers I own myself would add versioning work to save copying forty lines. |
| **JSDoc types, not TypeScript** | Type information on the domain functions and the shared contract, without a type-checking layer over an app this size. API responses are normalised and validated at runtime regardless — no compiler can vouch for what a remote service returns. |

## Known limitations

- **One page of results.** A search returns up to 200 works, OpenAlex's per-request maximum; the UI reports how many matched in total. There is no pagination, so an author list is built from the top 200 by relevance, not from the whole corpus.
- **Coverage is OpenAlex's coverage.** Strong for indexed journals; weaker for books, theses, non-English and non-indexed venues. An author absent here is not an author absent from the field.
- **Author disambiguation is OpenAlex's**, and it is good but not perfect. Occasional merges and splits exist upstream.
- **Affiliation is the most frequent one in the result set**, so a researcher who recently moved may show their previous institution.
- **The graph shows at most 20 authors.** Beyond that the labels collide at the top and bottom of the ring, where horizontal text needs the most room. The table below it shows everyone.
- **Co-authorship is counted within the result set only.** Two authors with fifty joint papers outside your topic show as unconnected if none of those papers matched.
- **The search is OpenAlex's full-text relevance search**, not the TF-IDF ranking used in stage 1. The two stages answer different questions and deliberately do not share a ranking.
- **No UI tests.** Unit tests cover the domain logic (grouping, edges, layout) and the pure parts of the API client. The network call itself is exercised by hand.

## Running locally

```bash
git clone https://github.com/AlexiaSPaiva/author-mapping.git
cd author-mapping
npm install
cp .env.example .env    # optional; see Environment variables
npm run dev             # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writing changes |

## Project structure

The same layout in all three litpipe repos:

```
src/
  domain/      pure logic, no I/O and no React — this is what the tests cover
    grouping.js      author aggregation, co-authorship edges, grouping, filters
    layout.js        circle positions, arc paths, node and edge scales
  services/    I/O at the edges
    openalex.js      API client: URL building, caching, rate-limit handling
    fileIo.js  storage.js
  ui/
    components/      CoauthorGraph (inline SVG), AuthorGroups, ProfileEditor
    pages/App.jsx    state and composition
  shared/      identical across the three apps
    researchProfile.js  theme.js  SuiteNav.jsx  MethodDisclaimer.jsx
```

## Tests

69 unit tests over the grouping logic, the graph geometry and the API-client's pure functions — including the cases that would quietly produce a wrong map: namesakes not being merged, A–B and B–A counted as one edge, no self-edge when an author is listed twice on a paper, consortium papers excluded and counted, and every node landing exactly on the circle.

```bash
npm test
```

## Security

- Every API response is normalised field by field with explicit fallbacks; a remote service's output is untrusted input.
- All user input is length-capped and the query is URL-encoded via `URLSearchParams`.
- Failure paths return readable messages, never raw errors, and never retry automatically.
- No secrets. The one environment variable is an email address for API etiquette, and it is not committed.
- No `eval`, no `dangerouslySetInnerHTML`. External links use `rel="noopener noreferrer"`.

---

## Resumo em português

Este é o **estágio 3 de 3** do litpipe: **triagem → leitura → mapeamento de autores**.

O `author-mapping` usa o tema da pesquisa para consultar a **API pública da OpenAlex** (gratuita, sem chave, metadados CC0) e agrupa os autores encontrados por critérios visíveis e configuráveis: volume de publicações no tema, instituição, país e período de atividade. Desenha também a **rede de coautoria** em SVG puro, sem biblioteca de grafos, e exporta a lista de autores em CSV.

A OpenAlex foi escolhida por um motivo decisivo: ela fornece **identificadores desambiguados de autor**. O Crossref devolve nomes como texto, o que funde dois "J. Smith" diferentes e separa a mesma pessoa grafada de duas formas — um mapa de autores construído sobre nomes é construído sobre areia.

**"Relevância" aqui é bibliométrica**: contagem de trabalhos, citações, coautoria e período de atividade. **Não mede qualidade científica.** Métricas de volume e citação têm vieses documentados de idioma, país, instituição e tempo de carreira. Isso está escrito na própria interface, não só aqui.

Requisições respeitam a etiqueta da API: parâmetro `mailto` (via variável de ambiente, para não versionar e-mail), cache local de 7 dias, e tratamento explícito de rate limit (HTTP 429) com mensagem clara e sem retry automático.

---

Built by [Alexia Paiva](https://github.com/AlexiaSPaiva) for the literature review of an undergraduate research project on dementia etiologies (UFF, IANS lab).
