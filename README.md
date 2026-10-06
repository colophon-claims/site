# colophon.claims

Public site for Colophon: a homepage, docs, one claim page for each published
report, boards that group claims sealed on the same method, and Find a claim,
a lookup over every listed claim. It serves each published evidence bundle
byte-exact for download. The site is a notary's display case, not a CMS: it
never transforms a published bundle.

Colophon itself (the CLI and workspace that produce the bundles) lives in the
[Jinn mono](https://github.com/Jinn-Network/mono) under
`packages/benchmark-product`.

## Stack

Next.js (App Router) with `output: "export"`: pure static files, no API
routes, no ISR, no middleware, no server of any kind. The exported site makes
**no external requests**: no analytics, no cookies, no CDN scripts, and no
remote fonts (the three typefaces are self-hosted from Fontsource packages,
pinned by `package-lock.json`).

```bash
npm install
npm run build        # validate the published reports, then export into out/
npm run dev          # local development
npm run typecheck
npm test             # some tests read out/ and run only after a build
```

Deploy by serving `out/` from a static host. On Vercel: framework preset
Next.js, output is detected from `output: "export"`, and
[`vercel.json`](vercel.json) is the one piece of host configuration. It holds
two rewrites, `/reports/:slug/bundle/index.html` to `/reports/:slug/bundle/`
and the same for an `index.html` at any depth below it, so a bundle's own
`index.html` is meant to be served at its own path (status 200, no redirect,
same bytes); the command below confirms it after a deploy. The export writes
that file at its own path, but Vercel serves an `index.html` only at its
directory URL, which is why the rewrite is needed there. Another host may or
may not need an equivalent rule: check it with `npm run check:bundle-urls`,
which walks a bundle's manifest against a base URL and reports every listed
path that does not come back with status 200 (`--verify-bytes` also checks
each SHA-256); it is
[`scripts/check-bundle-urls.mjs`](scripts/check-bundle-urls.mjs), with its
test in `test/bundle-urls.test.mjs`:

```bash
npm run check:bundle-urls -- https://colophon.claims <slug> --html-only --verify-bytes
```

## Vendored design system

`vendor/design-system/reference/` is a byte-for-byte copy of
`packages/benchmark-product/design-system/reference/` from the Jinn mono, and
`vendor/design-system/VENDORED.md` sits beside it.
The canonical copy lives in the Jinn mono; update by re-vendoring, never by
editing here. Source commit, date, and the re-vendor command are in
[`vendor/design-system/VENDORED.md`](vendor/design-system/VENDORED.md).

## Pages

`/` is the homepage: it features the one real published claim without
reproducing it. `/docs/` explains how Colophon works and how to check a
report.

`/reports/<slug>/` is the claim page, the permanent address for one sealed
claim and the destination a board or Find a claim links to. It leads with the
number and its seal, then what exactly ran, who ran it, and why believe it,
then the evidence row, with the report's prose, taken unchanged from the
claimant's reading record, below.

`/boards/` lists every board; `/boards/<slug>/` is one board, a view over
every listed claim sealed on one official suite, or on one locked method
that is no official suite. A board is keyed on the suite's identity or the
method's digest, never on the claimant's agent, and it is not a claim's
parent or its permission to exist. The build runs no checker, and no read
model records a suite identity yet, so every board today is keyed on its
locked method's digest (`boardKey` in `lib/bundle-facts.ts`).

`/find/` is Find a claim, a lookup over every publicly listed claim, newest
first, with a search box and a board filter. The order is by date, not
merit; it draws no comparison across suites or methods, and `/reports/`
renders this same page.

Facts a claim page or a board prints that the read model does not carry, such
as the claimant's signing key, the method's sealed name, and the bundle's
size, are read at build time from the bundle's own members by
`lib/bundle-facts.ts`. `run.json`, `benchmark.json` and `bundle.json` are
hash-checked against the read model's own digests before they reach the page.
Any other member a board reads, such as `evidence.json` or
`verification/assembly.jsonl`, is hash-checked against the SHA-256 that
`bundle.json` records for it.

## Publishing a report

A report starts as an immutable public bundle emitted locally by Colophon.
Ingest accepts two formats, `/7` and `/8`, and refuses any other, naming
these two. `/5` was retired: nothing publishes it, no board reads it, and the
checker's check list for it differs from `/7`.

| Format | What it is |
|---|---|
| `benchmark-product-public-bundle/7` | Anchored binary-qualification bundle |
| `benchmark-product-public-bundle/8` | The same, carrying a sealed six-variable disclosure-specification record |

The board reader, `listBoards` in `lib/boards.ts`, which the homepage, the
boards and Find a claim reach, throws for any listed report that is not `/7`
or `/8`, so the build fails rather than rendering a format nothing reads. The
front door's check refuses the same way before it lists anything.

Every format is read through a public reading record, which carries the
report's title, slug and text. A `/7` or `/8` bundle either seals it as
`presentation.json` or takes it at ingest with
`--presentation <file>`. The published LoCoMo judge report took the second
route: its bundle carries no `presentation.json`, and its record is
`data/reports/locomo-judge-report.presentation.json`. To put a report on the
site:

```bash
node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--presentation <file>]
npm run build
```

The ingest step:

1. validates the format's required members and the complete `bundle.json`
   manifest: every entry present, every byte length and SHA-256 matching, no
   stray files or symbolic links;
2. copies the bundle **byte-exact** into `public/reports/<slug>/bundle/`;
3. emits `data/reports/<slug>.json`, the read model the report page renders.
   Every field in it is extracted from the bundle's records or from its
   public reading record, never invented; a `--listing` file adds the
   `listing` section. A record supplied at ingest is written beside it, byte
   for byte, as `data/reports/<slug>.presentation.json`.
   The record names the report's title and slug, and ingest refuses a `--slug`
   that differs from it.

Commit the emitted data, the supplied record if there is one, and the copied
bundle. A `/7` or `/8` report also needs a listing time: the front door writes
one into the read model with `--listing`, and a report ingested without it needs
an entry in `data/listed-at.json`, or `npm run build` fails with "no listing
time; list it through the front door or record it in data/listed-at.json". It
then appears at `/reports/<slug>/`. Every path in the manifest is meant to be
served byte-exact under the report's `/bundle/` directory; see the deploy
paragraph above for the one path that needs a rewrite, and
`npm run check:bundle-urls` to check a deployed report.

(`--listing <file>` is how the front door, below, hands ingest what the bundle
does not say: when it was listed and where it was fetched from. The read model
then carries a `listing` section.)

### The anchored closures, `/7` and `/8`

`/7` carries a fixed set of manifest members (the bundle's core records,
verdicts, verification, trust keys, `qualification.json`, and rendered
assets), the `records/<sha256>.bin` evidence records, and one
`anchors/<sha256>.bin` per carried integrity anchor. It may also carry
`native/inspect/<sha256>.eval` logs, `verification/cancel-requested.json` and
a sealed `presentation.json`. `/8` is `/7` plus a sealed six-variable
disclosure-specification record, travelling as an ordinary
`records/<sha256>.bin` member and projected into the claim package's
`disclosure` section.

On these formats the public reading record is `colophon.report-presentation/2`
Sealed, it is the bundle's `presentation.json`.
Supplied at ingest, it is published beside the read model and the bundle is
copied byte for byte with nothing added: inserting a member into a published
bundle would change the very digest an auditor checks. Either way the site
assembles no public copy of its own. Ingest refuses a `/7` or `/8` bundle
that has neither, refuses one that has both, and refuses a record carrying a
section the site does not project rather than dropping it.

Beyond the manifest, ingest checks what these formats add:

- the claim schema pairing, `benchmark-product.claim-package/5` on `/7` and
  `/6` on `/8`, with `qualification.json` pinned at
  `benchmark-product.claim-package/2` on both, and no `disclosure` section on
  a `/7`;
- the digests the claim and the reading record name, against the bytes of
  `benchmark.json`, `run.json`, `matrix.json`, `report.json` and
  `report-envelope.json`;
- the verification check list for the format, in order, on the claim; on the
  reading record the same list, plus `report-presentation` when the record is
  sealed;
- every anchor the claim names against a carried `anchors/<sha256>.bin`, and
  every carried proof against a claim entry, in both directions;
- on `/8`, that the claim's `disclosure` section names a sealed record the
  bundle carries, that its subject digest is the one that record states, that
  the record carries exactly the six frozen variables, that the section is the
  record's own projection, and that every `measured-here` citation resolves
  to a record the bundle carries. Ingest does not check that the subject is
  this bundle's `matrix.json`; `validate:reports` does.

`validate:reports` (`scripts/validate-published-reports.mjs`) runs first in
`npm run build` and re-checks the copied bundle against the read model that
claims it. On every format it checks each manifest entry's length and SHA-256,
that no file is unlisted, and that the read model names the bundle's identity.
On `/7` and `/8` it also checks where the reading record lives and its digest,
the check lists, and the digests the read model and claim name; it recomputes
the published replicate-instability figure from the sealed item decisions
instead of trusting it, and every derived figure the record carries, each of
which must match its recomputation, and the ones the prose states in words must
also appear in the report's prose; it checks the anchors against the read
model; and on `/8` it checks that the disclosure's subject is this bundle's
`matrix.json`, that the read model and the claim carry the sealed record's
variables, and that every cited record is carried. It has no claim-schema
check (that is ingest's), and it runs no checker.

On a `/8` claim page the six variables and their statuses appear in the
report body; on every `/7` and `/8` page the full anchor list,
with the state embedded in each proof's own bytes, is behind the evidence
row's disclosure. This site supplies
no trust material and evaluates none, so an anchor reads as carried, never as
verified.

The read model for these formats lists `bundle.json`, the fixed members and
any optional members the bundle carries, and counts the rest. The complete
manifest is `bundle.json`, served byte-exact under the report; these bundles
carry tens of thousands of evidence records, and listing them all in the read
model would put them on the page.

Grouped ingest, `npm run ingest:grouped`, is still in the repository but
cannot publish today. It takes one binary-instrument bundle (`/4`), one
pairwise-disagreement bundle and one paired-majority-delta bundle (`/2` or
`/4`) from one run and emits a `colophon-grouped-report/1` read model, which
`listBoards` refuses (it reads only `/7` and `/8`), so `npm run build` fails:

```bash
npm run ingest:grouped -- <binary-bundle> <pairwise-bundle> <paired-delta-bundle> --slug <slug> --title "<title>" --reported-at <RFC3339-UTC>
```

It refuses unless all three bundles carry the same `runSha256` and
`matrixSha256`, all three `reportSha256` values are distinct, and every
copied member matches its manifest byte-for-byte. The published LoCoMo judge
report does not use this path: it is a single `/7` bundle, ingested as above,
with its six grading prompts sealed as arms of one claim.

## The front door (not open yet)

The front door lists a claim without anyone at Colophon typing it in. A
claimant opens the **List a sealed claim** issue form with one locator: an
https URL of a bundle directory, an https URL of a zip or tarball of one, or
`owner/repo@ref:path` on public GitHub. The `Front door` workflow then:

1. fetches the locator as a stranger would, refusing private, local and
   reserved destinations on every hop (`scripts/front-door/fetch.mjs`);
2. runs the checker line the bundle sealed in `claim-package.json`, with
   `npx --yes` and an empty npm cache. Only `@colophon-claims/verify` or
   `@colophon-claims/check` at an exact release is run;
3. on a pass, runs `scripts/ingest-report.mjs --listing`, which adds a
   `listing` section to the read model (locator, resolved commit, listing
   time, board key, venue, and the row's date named by its source field);
4. opens a pull request that only adds this listing's files, dispatches the
   `Listing re-check` workflow on it, and asks for auto-merge.

A refusal is posted on the issue, with the checker's own output when the
checker ran, and nothing is listed. The first job runs with read-only
permissions; only the second, which runs none of the submitted bytes, can
write.

The door is shut: `scripts/front-door/door.mjs` answers every submission with
that, before fetching anything, until a bundle the sealing tool emits by
default can pass the published checker and be projected here
([Jinn-Network/mono#4760](https://github.com/Jinn-Network/mono/issues/4760)).
Opening it is a reviewed change to that file, plus repository settings: allow
auto-merge, and require the `Listing re-check` (from GitHub Actions) and Vercel
checks on `main`, with branches up to date before merging, so a second listing
of the same bundle is re-checked against the first once it has merged.

## Append-only URL policy

Report URLs are append-only from here. The ingest script refuses to overwrite
an existing slug, and nothing on the site edits an ingested bundle. Publishing
a correction means publishing a new bundle under a new slug; the old URL keeps
serving the old bytes.

There is one exception: the page for
`skill-vs-root-claude-md-haiku-4-5` was unpublished (pull request #15,
2026-09-04) and its leftover bundle files removed (pull request #39,
2026-09-29). Its URL returns 404. It is the only published report removed (a
fixture page removed before go-live is not counted).

## Page copy

The homepage keeps its short, plain register and features the one real
published claim without reproducing it. The public report title and slug come
from the report's public reading record, whether sealed as a
`presentation.json` or supplied at ingest; internal run labels stay confined
to technical provenance and sealed source filenames. Public contact is
`ritsu.kai2000@gmail.com`.

The claim page leads with the number and its seal, then what exactly ran, who
ran it, and why believe it, then the evidence row; the report's prose, taken
unchanged from the claimant's reading record, follows below.

The reader command shown publicly is
`npx @colophon-claims/verify@0.2.1 ./bundle` (latest on npm as of 30 September
2026; the checker's README says `/7` and `/8` exist only from 0.2.1, so earlier
releases, 0.2.0 included, do not read this format; Node 22 or newer). For the
published report's format, `/7`, the checker runs seven checks, in order:
manifest, evidence-closure, trust, matrix-rederivation, report-verification,
claim-consistency, integrity-anchors. The report also keeps the manifest,
report envelope, claim package, digests, and source disclosures directly
available.

Broader framework and execution copy belongs in Docs, not in a report's
provenance. A report names only the stack that produced its evidence. Docs may
name implemented source paths only with their release state attached.

## Checking a deploy

The site is live at https://colophon.claims. A deploy is good when the site
is served over valid HTTPS, a report URL returns the ingested bytes (the
command below checks a sample), the contact address on the page is the one
above and works, and a browser network check shows no external requests.
DNS and the human-contact surfaces remain operator actions.

```bash
npm run check:bundle-urls -- https://colophon.claims <slug> --verify-bytes --every 200
```
