# FIXTURE public bundle

Every number in this bundle is synthetic sample data. Nothing was run, no
signature verifies, and no claim in it is about the world. It exists so the
colophon.claims site can build and render its report route before the first
real bundle is published, and so the ingest pipeline has a conforming input
to validate against.

Layout follows benchmark-product-public-bundle/1: the 16 fixed members, one
records/<sha256>.bin per evidence record, and bundle.json binding every
member's path, byte length, and SHA-256. Deviations from a real bundle, on
purpose: only 3 of the declared 40 task records are materialized, only one
cell's delivery and verdict records are present, and the DSSE signatures are
placeholder strings.

Regenerate with: node scripts/make-fixture.mjs
