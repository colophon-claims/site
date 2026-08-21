# Vendored Colophon design system

| | |
|---|---|
| Source | `packages/benchmark-product/design-system/reference/` in the Jinn mono |
| Source commit | `611c718e94e72054bcc055b07d190f96cdbec26d` (sealed report merge) |
| Vendored | 2026-08-21 |

The canonical copy lives in the Jinn mono; update by re-vendoring, never by
editing here.

Re-vendor with:

```bash
git -C <jinn-mono-checkout> archive <commit> packages/benchmark-product/design-system/reference \
  | tar -x --strip-components=3 -C vendor/design-system
```

Then update the source commit and date in this file.

## How this site consumes it

- Token CSS (`reference/tokens/*.css`) is imported directly into the app's
  global stylesheet, except `fonts.css`, which points at `fonts.gstatic.com`.
  This site makes no external requests: the same three typefaces are
  self-hosted from pinned Fontsource npm packages, and `app/globals.css`
  overrides the `--font-*` stacks to name the Fontsource families first.
- React components (`reference/components/**/*.jsx`) are imported as-is where
  possible. Components that need a client boundary or an anchor-shaped variant
  are wrapped or adapted in `components/`, never modified in place.
- SVG assets are copied byte-for-byte into `public/brand/` for same-origin use.
- The ui_kits (`reference/ui_kits/site`, `reference/ui_kits/report`) are the
  visual reference the pages are matched against; their `window.__C` global
  wiring is not executed by this site.
