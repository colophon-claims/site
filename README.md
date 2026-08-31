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

## Publishing a report

A report starts as an immutable public bundle emitted locally by Colophon.
The site accepts four formats:

| Format | What it is |
|---|---|
| `benchmark-product-public-bundle/1` | Legacy application bundle |
| `benchmark-product-public-bundle/5` | Evidence-native claim bundle |
| `benchmark-product-public-bundle/7` | Anchored binary-qualification bundle |
| `benchmark-product-public-bundle/8` | The same, carrying a sealed six-variable disclosure-specification record |

Every format except `/1` carries its public reading record in
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

`/7` is the legacy member list plus `qualification.json`, plus one
`anchors/<sha256>.bin` per carried integrity anchor. `/8` is `/7` plus a sealed
six-variable disclosure-specification record, travelling as an ordinary
`records/<sha256>.bin` member and projected into the claim package's
`disclosure` section.

Ingest refuses a `/7` or `/8` bundle whose manifest does not bind
`presentation.json`. The site renders a report from its sealed public reading
record and never assembles one here, so a bundle without that member has no
ingestable public copy; publish one that carries it. The reading record for
these formats is `colophon.report-presentation/2`, and the ingester refuses a
record carrying a section the site does not project rather than dropping it.

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

The report page renders the six variables with their statuses as its opening
section, and the anchors with the state embedded in each proof's own bytes.
This site supplies no trust material and evaluates none, so an anchor reads as
carried, never as verified.

The read model for these formats lists the fixed members only. The complete
manifest is `bundle.json`, served byte-exact under the report; these bundles
carry tens of thousands of evidence records, and listing them all in the read
model would put them on the page.

The LoCoMo judge report is one run with three independently sealed analyses.
Ingest those bundles as one permanent reader page with:

```bash
npm run ingest:grouped -- <binary-bundle> <pairwise-bundle> <paired-delta-bundle> --slug <slug> --title "LoCoMo judge report" --reported-at <RFC3339-UTC>
```

Grouped ingest requires one binary-instrument, one pairwise-disagreement, and
one paired-majority-delta bundle. It refuses unless all three carry the same
`runSha256` and `matrixSha256`, all three `reportSha256` values are distinct,
and every copied member matches its manifest byte-for-byte.

## Append-only URL policy

Report URLs are immutable. The ingest script refuses to overwrite an existing
slug, and nothing on the site ever edits an ingested bundle. Publishing a
correction means publishing a new bundle under a new slug; the old URL keeps
serving the old bytes.

## Page copy

The landing page keeps the short v4 register and features the first real
report without reproducing it. The public report title and slug come from the
bundle's `presentation.json`; internal run labels stay confined to technical
provenance and sealed source filenames. Public contact is
`ritsu@colophon.claims`.

The reader command shown publicly is
`npx @colophon-claims/verify@0.1 ./bundle`. The public reader checks the
manifest, evidence closure, artifacts, signatures, matrix, signed report, and
claim consistency. The report also keeps the manifest, report envelope, claim
package, digests, and source disclosures directly available.

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
