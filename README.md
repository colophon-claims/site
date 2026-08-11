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

A report starts as a public bundle produced by `colophon publish`
(format `benchmark-product-public-bundle/1`; see `PUBLIC-BUNDLE.md` in the
Jinn mono). To put it on the site:

```bash
node scripts/ingest-report.mjs <bundle-dir> --slug <slug>
npm run build
```

The ingest step:

1. validates the bundle against its own `bundle.json` manifest: the 16 fixed
   members present, every entry's byte length and SHA-256 matching, no stray
   files;
2. copies the bundle **byte-exact** into `public/reports/<slug>/bundle/`;
3. emits `data/reports/<slug>.json`, the read model the report page renders.
   Every field in it is extracted from the bundle's records, never invented.

Commit all three (the emitted data, the copied bundle, and nothing else) and
the report appears at `/reports/<slug>/` with a download table linking every
bundle member.

## Append-only URL policy

Report URLs are immutable. The ingest script refuses to overwrite an existing
slug, and nothing on the site ever edits an ingested bundle. Publishing a
correction means publishing a new bundle under a new slug; the old URL keeps
serving the old bytes.

## The fixture

No real bundle exists yet, so the repo ships one dev fixture
(`fixtures/sample-bundle/`, ingested as slug `fixture-skills-vs-agentsmd`)
that conforms to the bundle format's file layout. Every value in it is
synthetic and labeled as such: in the title, in the bundle's own README,
badge, social card, and share text, and by the fixture banner the report page
renders. Regenerate it with `node scripts/make-fixture.mjs` (deterministic;
regeneration is byte-stable). When the first real report is published, the
fixture ingest can be dropped by deleting `data/reports/fixture-*.json` and
`public/reports/fixture-*/`.

## Page copy

The landing page copy is the Colophon surface copy v1.0 (2026-08-11),
rendered verbatim. The `<contact email>` and `<demo report #2 title>` tokens
are deliberately visible placeholders until those values exist.
