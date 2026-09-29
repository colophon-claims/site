# colophon.claims

Public site for Colophon: it renders published benchmark reports at immutable
URLs and serves their evidence bundles byte-exact for download, with a
one-page landing around them. The site is a notary's display case, not a CMS:
it never transforms a published bundle.

Colophon itself (the CLI and workspace that produce the bundles) lives in the
[Jinn mono](https://github.com/Jinn-Network/mono) under
`packages/benchmark-product`.

## Stack

Next.js (App Router) with `output: "export"`: pure static files, no API
routes, no ISR, no middleware, no server of any kind. The exported site makes
**no external requests**: no analytics, no cookies, no CDN scripts, and no
remote fonts (the three typefaces are self-hosted from pinned Fontsource
packages).

```bash
npm install
npm run build        # static export into out/
npm run dev          # local development
npm run typecheck
```

Deploy by serving `out/` from any static host. On Vercel: framework preset
Next.js, output is detected from `output: "export"`; nothing else to
configure.

## Vendored design system

`vendor/design-system/` is a byte-for-byte copy of
`packages/benchmark-product/design-system/reference/` from the Jinn mono.
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
then the evidence row, with the claimant's own report unchanged below.

`/boards/` lists every board; `/boards/<slug>/` is one board, a view over
every checked claim sealed on one official suite, or on one locked method
that is no official suite. A board is keyed on the suite's identity or the
method's digest, never on the claimant's agent, and it is not a claim's
parent or its permission to exist.

`/find/` is Find a claim, a lookup over every publicly listed claim, newest
first, with a search box and a board filter. The order is by date, not
merit; it draws no comparison across suites or methods, and `/reports/`
renders this same page.

Facts a claim page or a board prints that the read model does not carry, such
as the claimant's signing key, the method's sealed name, and the bundle's
size, are read at build time from the bundle's own members by
`lib/bundle-facts.ts`, each hash-checked against the read model's own digests
before it reaches the page.

## Publishing a report

A report starts as an immutable public bundle emitted locally by Colophon.
The site accepts three formats:

| Format | What it is |
|---|---|
| `benchmark-product-public-bundle/5` | Evidence-native claim bundle |
| `benchmark-product-public-bundle/7` | Anchored binary-qualification bundle |
| `benchmark-product-public-bundle/8` | The same, carrying a sealed six-variable disclosure-specification record |

Every format carries its public reading record in
`presentation.json`. To put any of them on the site:

```bash
node scripts/ingest-report.mjs <bundle-dir> --slug <slug>
npm run build
```

The ingest step:

1. validates the format's required members and the complete `bundle.json`
   manifest: every entry present, every byte length and SHA-256 matching, no
   stray files or symbolic links;
2. copies the bundle **byte-exact** into `public/reports/<slug>/bundle/`;
3. emits `data/reports/<slug>.json`, the read model the report page renders.
   Every field in it is extracted from the bundle's records, never invented.

Commit the emitted data and copied bundle. The report appears at
`/reports/<slug>/`. Evidence-native pages link the canonical report files and
the complete manifest; every manifest-bound path remains served under the
report's `/bundle/` directory.

### The anchored closures, `/7` and `/8`

`/7` carries a fixed set of manifest members (the bundle's core records,
verdicts, verification, trust keys, and rendered assets) plus
`qualification.json`, plus one `anchors/<sha256>.bin` per carried integrity
anchor. `/8` is `/7` plus a sealed
six-variable disclosure-specification record, travelling as an ordinary
`records/<sha256>.bin` member and projected into the claim package's
`disclosure` section.

The public reading record, `colophon.report-presentation/2`, reaches the site
one of two ways: sealed into the bundle as a `presentation.json` member, on a
closure that carries one, or supplied at ingest with
`--presentation <file>` and published beside the read model as
`data/reports/<slug>.presentation.json`. The second mode exists because no
current closure binds the member, and inserting one into a published bundle
would change the very digest an auditor checks; a bundle ingested that way is
copied byte for byte with nothing added. Either way the site assembles no
public copy of its own: ingest refuses a `/7` or `/8` bundle that has neither,
and refuses a record carrying a section the site does not project rather than
dropping it.

Beyond the manifest, ingest checks what these formats add:

- the claim id pairing, `/5` on `/7` and `/6` on `/8`, with `qualification.json`
  pinned at `benchmark-product.claim-package/2` on both;
- the verification check list for the format, in order, on both the claim and
  the reading record;
- every anchor the claim names against a carried `anchors/<sha256>.bin`, and
  every carried proof against a claim entry, in both directions;
- on `/8`, that the claim's `disclosure` section is the sealed record's own
  projection, that its subject is this bundle's result matrix, and that every
  `measured-here` citation resolves to a record the bundle carries.

`validate:reports` re-checks all of that against the copied bundle rather than
the read model that claims it, and recomputes the published replicate-instability
figure from the sealed item decisions instead of trusting it.

The claim page shows the six variables with their statuses in the claimant's
own report body, and the full anchor list, with the state embedded in each
proof's own bytes, behind the evidence row's disclosure. This site supplies
no trust material and evaluates none, so an anchor reads as carried, never as
verified.

The read model for these formats lists the fixed members only. The complete
manifest is `bundle.json`, served byte-exact under the report; these bundles
carry tens of thousands of evidence records, and listing them all in the read
model would put them on the page.

Grouped ingest is a separate, available path for a run that seals three
independent analyses, one binary-instrument, one pairwise-disagreement, and
one paired-majority-delta bundle, as one permanent reader page:

```bash
npm run ingest:grouped -- <binary-bundle> <pairwise-bundle> <paired-delta-bundle> --slug <slug> --title "<title>" --reported-at <RFC3339-UTC>
```

It refuses unless all three bundles carry the same `runSha256` and
`matrixSha256`, all three `reportSha256` values are distinct, and every
copied member matches its manifest byte-for-byte. The published LoCoMo judge
report does not use this path: it is a single `/7` bundle, ingested as above,
with its six grading prompts sealed as arms of one claim.

## Append-only URL policy

Report URLs are immutable. The ingest script refuses to overwrite an existing
slug, and nothing on the site ever edits an ingested bundle. Publishing a
correction means publishing a new bundle under a new slug; the old URL keeps
serving the old bytes.

## Page copy

The homepage keeps the short v4 register and features the one real published
claim without reproducing it. The public report title and slug come from the
bundle's `presentation.json`; internal run labels stay confined to technical
provenance and sealed source filenames. Public contact is
`ritsu.kai2000@gmail.com`.

The claim page leads with the number and its seal, then what exactly ran, who
ran it, and why believe it, then the evidence row; the claimant's own report
follows below, unchanged.

The reader command shown publicly is
`npx @colophon-claims/verify@0.2.1 ./bundle` (npm's current latest; Node 22 or
newer). For the published report's format, the checker runs seven checks, in
order: manifest, evidence-closure, trust, matrix-rederivation,
report-verification, claim-consistency, integrity-anchors. The report also
keeps the manifest, report envelope, claim package, digests, and source
disclosures directly available.

Broader framework and execution copy belongs in Docs, not in a report's
provenance. A report names only the stack that produced its evidence. Docs may
name implemented source paths only with their release state attached; the
current npm package cut is still a public-availability gate.

## Operator go-live check

The static preview is not the live increment. Go-live is complete only when
the operator has pointed `colophon.claims` at the static export, HTTPS is
valid, the append-only report URL returns the ingested bytes, the contact
address works, and a browser network check shows no external requests. DNS,
the domain flip, and human-contact surfaces remain operator actions.
