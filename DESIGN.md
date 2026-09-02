---
name: Colophon
description: A precise, public reading surface for claims that can be checked.
colors:
  ink-900: "#14120e"
  ink-600: "#5c554c"
  ink-300: "#c6bfb4"
  ink-50: "#f4f1e9"
  paper: "#f7f4ed"
  paper-raised: "#fffdf8"
  vermilion-600: "#a8331f"
  vermilion-500: "#c7402a"
  vermilion-100: "#f6dfd9"
  indigo-600: "#27406b"
  indigo-100: "#dce3ee"
  moss-600: "#2e6144"
  moss-100: "#dde9e1"
  ochre-600: "#8a6113"
  ochre-100: "#f2e6cc"
typography:
  display:
    fontFamily: '"Newsreader", Georgia, "Times New Roman", serif'
    fontSize: "62px"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  editorial-body:
    fontFamily: '"Newsreader", Georgia, "Times New Roman", serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.62
  ui:
    fontFamily: '"Public Sans", -apple-system, "Segoe UI", Helvetica, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Public Sans", -apple-system, "Segoe UI", Helvetica, sans-serif'
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
  mono:
    fontFamily: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0"
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  pill: "999px"
spacing:
  space-0: "0"
  space-1: "2px"
  space-2: "4px"
  space-3: "6px"
  space-4: "8px"
  space-5: "12px"
  space-6: "16px"
  space-7: "20px"
  space-8: "24px"
  space-9: "32px"
  space-10: "40px"
  space-11: "56px"
  space-12: "72px"
  space-13: "96px"
  space-14: "128px"
  space-15: "160px"
  gutter: "24px"
  gutter-lg: "40px"
  page-max: "1240px"
  reading-max: "720px"
  report-max: "880px"
components:
  button-primary:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
    height: "44px"
  button-accent:
    backgroundColor: "{colors.vermilion-600}"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
    height: "44px"
  tag-neutral:
    backgroundColor: "{colors.ink-50}"
    textColor: "{colors.ink-600}"
    rounded: "{rounded.xs}"
    padding: "2px 7px"
  card-raised:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: Colophon

## Overview

**Creative North Star: "The Notarised Record"**

Colophon reads as a record set on a table for inspection. It is exact, plain, and calm. Ink, paper, rules, measured type, and small evidence marks do the work. The design is quiet enough to let a claim and its proof carry the attention.

This document records the vendored system as it exists. It was read from vendor/design-system/reference/styles.css; vendor/design-system/reference/tokens/colors.css, typography.css, space.css, surfaces.css, evidence.css, motion.css, and base.css; vendor/design-system/reference/components/core/Button.jsx, Input.jsx, and Tag.jsx; vendor/design-system/reference/components/editorial/Card.jsx, Callout.jsx, and SectionHead.jsx; vendor/design-system/reference/components/claim/ClaimBadge.jsx, MethodLock.jsx, and ReportCard.jsx; and vendor/design-system/reference/components/evidence/VerdictChip.jsx, AssuranceMeter.jsx, and CompletenessBar.jsx.

The system provides a light theme and a semantic dark-theme override. Its spacing scale runs from 2px to 160px on an 8px baseline. Reading measure is 66ch, with dedicated 720px and 880px maximum widths for long reading and reports. UI state changes use the standard transition at 120ms, while reduced-motion mode makes every token duration instant.

**Key Characteristics:**

- Rules and compact borders establish structure before shadows do.
- Serif reading text, sans-serif interface text, and monospace evidence each have a distinct job.
- Semantic verdict labels, borders, and patterns communicate state together.
- Small corners and limited accent use keep the surface document-like.

## Colors

The palette is ink on paper, with printer's inks reserved for links, actions, and evidence states. The frontmatter is the normative record of the extracted light-theme primitives.

### Primary

- **Deep Ink:** The default text, inverse surface, and primary action colour. It makes the page read as a printed record rather than a promotional surface.
- **Paper:** The page surface. **Raised Paper** is the quiet card and control surface.

### Secondary

- **Vermilion:** The accent for important action, active details, and unmet evidence. Use it as a mark, not a field of decoration.
- **Indigo:** The link, focus, note, and attested-evidence colour.

### Tertiary

- **Moss:** The met-evidence colour.
- **Ochre:** The conflicted-evidence and limitation colour.

### Neutral

- **Faded Ink:** Secondary text and quiet supporting detail.
- **Rule Ink:** The structural line colour for hairline borders and dividers.

**The Evidence Has More Than One Signal Rule.** Verdict components pair a written status with semantic colour and, when origin needs to be shown, a solid, hatch, dot, or conflict pattern. A colour alone never carries evidence state.

The dark theme swaps the semantic text, surface, rule, action, and verdict roles in tokens/colors.css. Continue to use semantic roles rather than hard-coding light-theme values.

## Typography

**Display Font:** Newsreader, with Georgia and Times New Roman fallbacks.
**Body Font:** Public Sans, with platform sans-serif fallbacks for interface copy.
**Label/Mono Font:** IBM Plex Mono for data and code; Public Sans for labels.

**Character:** Newsreader gives public reading text a measured, literary texture. Public Sans stays direct and legible in controls. IBM Plex Mono separates evidence, dates, identifiers, and commands from prose.

### Hierarchy

- **Display:** The display role is for hero statements and major page titles.
- **Headline:** The title role is for page and section headings, with the section role for smaller editorial headings.
- **Title:** Section heads use a 31px display treatment, with the title and section roles sharing the display family.
- **Body:** Editorial paragraphs use the dedicated editorial-body role and a 66ch measure. Interface body text uses the UI role.
- **Label:** Labels are 11px semibold Public Sans in uppercase with caps tracking. They identify a field or record without competing with its value.
- **Data and code:** Data and code use the mono role at 13px. Keep these values compact, readable, and visibly separate from explanation.

**The Three Jobs Rule.** Do not use the mono face as a decorative signal of technicality. Use the display, UI, and mono families only for reading, interface, and evidence respectively.

## Elevation

This is a flat system by default. Paper, inset paper, hairline rules, and 2px or 3px top rules establish depth. Small shadows are reserved for raised, pop, and overlay states, never as a decorative haze around every surface.

### Shadow Vocabulary

- **Raise:** 0 1px 0 rgba(20,18,14,.04), 0 1px 2px rgba(20,18,14,.06). Use for a small lift.
- **Pop:** 0 2px 4px rgba(20,18,14,.06), 0 8px 20px rgba(20,18,14,.10). Use for a deliberate elevated state.
- **Overlay:** 0 12px 40px rgba(20,18,14,.18). Use only above the normal document surface.
- **Pressed:** inset 0 1px 2px rgba(20,18,14,.14). Use for a pressed control state.

**The Rule-First Rule.** Default structure comes from borders and tonal surfaces. Do not add a shadow where a 1px rule communicates the boundary.

## Components

### Buttons

Buttons are compact, semibold UI controls with a 1px border and small corners. The three documented medium variants use a 44px minimum height. Primary uses inverse ink; accent uses vermilion; secondary uses raised paper with a strong rule. Ghost and danger variants remain transparent. Disabled buttons use 45% opacity. State changes use the standard colour, background, and border transition.

### Tags and verdict chips

Tags use 2px corners, a 1px border, compact padding, and UI or mono type. Verdict chips add a status label, a matching border, and an optional evidence texture. Do not replace their text with an icon or colour alone.

### Cards and containers

Raised cards use paper-raised, a 1px rule, 4px corners, and 24px internal padding. Sunken cards use the inset surface; flat cards have no fill. Report cards use a 3px vermilion top rule as a factual locator. Editorial callouts and method locks use a 2px semantic top rule, not a coloured side stripe.

### Inputs and fields

Inputs use raised paper, a 1px strong rule, 3px corners, and 8px vertical padding. Invalid fields replace the rule with vermilion. Field labels use the label role; prefixes, suffixes, and hints use the mono role.

### Navigation and focus

Links are underlined with a 1px, 2px-offset line and change to vermilion on hover. Visible keyboard focus is a 2px indigo outline with a 2px offset. Do not remove this focus treatment.

### Claim and evidence records

Claim badges combine an ink identity block, a paper value block, and a written status block in a 22px mono treatment. Method locks and callouts place state in a written label, supporting explanation, and semantic top rule. Completeness bars use a legend and their patterns distinguish observed, attested, missing, and conflicted evidence.

## Do's and Don'ts

### Do:

- **Do** use the semantic colour, surface, text, rule, action, and verdict tokens from tokens/colors.css rather than introducing local colours.
- **Do** keep ordinary surfaces flat, with a 1px rule and the 2px, 3px, or pill radius that the component calls for.
- **Do** use the 2px to 160px space scale and preserve the 66ch reading measure.
- **Do** pair every evidence state with its written label. Use the documented fill pattern when the way a result was obtained matters.
- **Do** keep motion to the 80ms to 420ms token scale and respect the existing reduced-motion override.

### Don't:

- **Don't** make an AI-startup landing page with a gradient hero, a "trusted by 10,000 teams" logo strip, or three feature cards with icons.
- **Don't** make a leaderboard or analytics dashboard. Ranking is not this system's visual language.
- **Don't** make anything read as a pitch. The closing section invites a conversation; it never closes a sale.
- **Don't** use a coloured side stripe, glass surfaces, decorative gradients, or default soft shadows. Evidence patterns are reserved for their stated meaning.
- **Don't** use a verdict colour, green tick, or status icon without the corresponding written status and supporting context.
- **Don't** enlarge corner radii, replace rules with large cards, or add visual urgency that competes with the record.
