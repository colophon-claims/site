# End-state design preview

`site.html` is a single-file drawing of the site's end state: the homepage, a claim page, a board, the boards index, Find a claim, and the front door. Open it in a browser. It is a design reference for the issues that build those pages. It is not part of the site: nothing in this folder is built, exported or served.

## How to use it

- **The issues win.** Each page's issue states the decisions the page follows. Where this drawing disagrees with an issue, build what the issue says.
- **Everything in it is fictional except the layout.** The claimants, suites, results and digests are made up. Every digest begins with `mock-`, and each fictional record says so on the page. Take no fact from it.
- **It breaks the site's own rules in ways the real pages must not.** It loads fonts from Google Fonts and inlines everything into one file. The real pages make no external requests, use the self-hosted fonts and the vendored design system, and stay a static export (see `PRODUCT.md` and `DESIGN.md`).

## Where the drawing is out of date

Drawn before these decisions, so the issues are right and the drawing is wrong:

1. **Board key.** The drawing keys each board on a benchmark digest ("Board key: the locked benchmark, sha256:…") and would put full and subset runs on separate boards. The decision is one board per official suite, keyed on the suite identity (for example `terminal-bench-2.1`), with every coverage on it. A method that is no official suite is keyed on the digest of its locked method.
2. **Coverage on each row.** Every board row shows the coverage it took, and any row short of full carries a visible marker. The drawing has no marker.
3. **Row order.** The default order is date sealed, newest first, and it renders without script. Readers can re-sort by column using the page's own script, with keyboard-operable headers. The drawing has no sorting.
4. **The first real board.** The published LoCoMo judge report gets a board of its own, with its six grading prompts as the first rows. The drawing leaves it out.
5. **Claimant.** Where no claimant name is recorded, a row shows the owner's signing key rather than a name.
