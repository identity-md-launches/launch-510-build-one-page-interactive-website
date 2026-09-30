# Block Rhythm design system

## Overview

Block Rhythm is a dark, compact Ethereum explorer for people who want to see the shape of network activity. A restrained mint waveform is the focal point. The page proceeds from network context, to four summary metrics, to the timeline and its controls, then recent block data and a short explanatory panel. The implemented direction combines a music visualizer with a legible instrument panel.

The source of truth is `src/styles.css`; page patterns are in `src/App.tsx`. This is one English-language, dark-theme page. Additional themes, accounts, wallets and audio are not part of this implementation.

## Colors

CSS uses a hex primitive palette with semantic aliases in `:root` (`src/styles.css:8`). Components use semantic tokens except for a few chart-specific SVG colors and subtle surface gradients.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--bg-page` | `#0b100f` | Page and header |
| `--bg-panel` | `#101715` | Cards, table, timeline |
| `--bg-active` | `#131c18` | Playback control strip |
| `--bg-hover` | `#1b2620` | Hover and selected filter surface |
| `--border` | `#29372f` | Panel and control structure |
| `--text` | `#edf3ee` | Primary text |
| `--text-secondary`, `--text-muted` | `#94a299` | Labels, captions, secondary values |
| `--accent` | `#9cf6c9` | Primary playback action and brand rhythm |
| `--accent-ink` | `#0b100f` | Text on the mint button |
| `--focus` | `#c0ffe0` | Keyboard outline |
| `--activity-low` | `#94a299` | Low activity |
| `--activity-medium` | `#68bb91` | Medium activity |
| `--activity-high` | `#9cf6c9` | High activity |
| `--warning` | `#e4ca91` | Connection warning text |

Other used primitives: `--neutral-200: #c8d2ca` for secondary emphasis, `--mint-700: #4c8b6a` for gas meters, and `--mint-100: #c0ffe0` for primary-button hover. The live pill uses `#14291e` with a `#2e503d` border; connection notices use `#211e16` with `#66593d` borders.

The SVG pulse gradient runs `#b8f9da → #8cedbb → #4c8b6a`. Height and brightness encode the same activity score; the labeled Low/Medium/High badges add a non-color cue with one, two or three emphasized bars. Selection adds a dotted vertical line and a white center point. Filtering reduces nonmatching pulse opacity to 0.13; the complete numeric table and range control remain the accessible alternatives.

Measured solid pairs: main text/page 17.03:1, secondary text/panel 6.83:1, medium activity/panel 7.88:1, button text/mint 15.01:1. The lightest conservative composite of the guide gradient gives secondary text 6.23:1. These are identified pairs/bounds, not a claim that every rendered pixel or chart mark has been audited. See `artifacts/validation.md`.

## Typography

`public/fonts/geist-latin.woff2` supplies normal variable Geist, weights 100–900, with `font-display: swap`; browser inspection confirmed the face loaded. The sans stack is `Geist, Arial, sans-serif`. Numeric values use `'SFMono-Regular', Consolas, 'Liberation Mono', monospace` and tabular numerals. Fonts and licenses are bundled locally.

Root text is 16px, weight 400, line-height 1.5, with font optical sizing and root antialiasing. The semantic size tokens are `--text-xs: .75rem`, `--text-sm: .8125rem`, `--text-body: .875rem`, `--text-base: 1rem`, `--text-section: 1rem`, `--text-metric: 1.875rem`, and `--text-display: clamp(2rem, 3.5vw, 3.2rem)`.

- The hero is weight 500, line-height 1.18 and -1.9px letter spacing; it drops to 2.45rem below 740px and 2.1rem below 440px with tighter mobile tracking.
- Panel headings are 16px/550; the explanatory heading is 23px/500. At the narrowest breakpoint panel headings are 14px.
- Metric values are normally 30px, with compact breakpoint overrides (the long latest-block number uses 20px below 440px); units are smaller sans text. All changing numbers use stable-width digits.
- Hero copy is 14px; explanatory body copy is 12px at 1.7 line-height. Dense table and instrument captions use 9–12px, with timestamp metadata as small as 8px below 440px. This density is deliberate; native zoom and physical-device legibility remain unverified.
- Headings use balanced wrapping; paragraphs use pretty wrapping. Long IDs are not clipped: the interface displays block numbers, while full hashes remain in the data. Uppercase eyebrows are transformed with CSS.

## Layout

`.page-shell` and `.header-inner` share a 1408px maximum width and 48px inline padding. The spacing tokens are 4, 8, 12, 16, 20, 24, 32, 40 and 48px (`--space-1` through `--space-12`); current components also use these values directly. The metric grid has four equal columns and 16px gaps. The lower grid uses a flexible table plus a 330px guide, separated by 24px. Most panel interiors align to 24px insets.

The timeline SVG fills available width using a fixed 1200×240 coordinate system, preserving all 50 blocks without horizontal scrolling. Pulse amplitude changes height, not the layout. The labeled native range below it provides precise selection when the pulses are narrow. Playback snapshots retain their own stable order while live metrics continue updating.

Implemented breakpoints:

| Width | Behavior |
| --- | --- |
| ≥1500px | Larger hero spacing and 240px chart height |
| ≤1150px | 32px page insets, smaller metrics, hidden decorative hero aside |
| ≤900px | Compact card typography, 265px guide column, inspector wraps |
| ≤740px | 24px page insets, two-column metric grid, one-column lower section, compact header; playback controls wrap and slider occupies a full row; touch controls generally 44px |
| ≤440px | 16px page insets, smaller metadata, aligned 30px metric-label rows, no beta label, simplified network label and chart axis; replay options wrap; all data columns remain present |

Rendered at 1440, 820, 390 and 320px; automated overflow checks also covered 1024, 740 and 600px. DOM order follows the visual reading order. No horizontal page overflow was found at those widths. No fixed-height text cards or modal overlays are used.

## Elevation & Depth

The interface is mostly flat. One-pixel borders separate functional areas. Metric cards have a subtle page-to-panel gradient; the guide has a restrained green radial wash. The selected pulse uses a small glow (`drop-shadow`) to identify the playhead. There are no floating drawers, modal shadows or sticky controls. The skip link alone uses elevated stacking (`z-index: 10`).

## Shapes

Tokens: `--radius-sm: 5px`, `--radius-md: 8px`, `--radius-lg: 12px`. Buttons use 5px, metric cards 8px, main panels 12px. Compact pills and count badges use 4px. Pulse bars have 1.5px end radii. Status dots and slider thumbs are circular. Clip paths conceal the skip link until focus without removing it from keyboard order.

## Components

- **`Icon`, `EthereumIcon`, `Level`** (`src/icons.tsx`): local, decorative SVG icons using `currentColor`. `Icon` accepts `name`, `size` and optional `style`; `Level` accepts `low`, `medium` or `high`. Base stroke is 1.5px, primary-button stroke 2px.
- **`Sparkline`** (`src/App.tsx`): decorative mini-chart receiving numeric values. It supplements rather than replaces the summary value.
- **Metric pattern** (`.metrics`, `.metric`): labeled value, unit and supporting caption; loading values are dashes and the summary region is busy until data arrives.
- **Filter pattern** (`.filters`, `.filter`): native buttons inside a named group; `aria-pressed`, filled neutral selection, border and dot communicate state. Low, Medium and High use the same shared `Level` markers as the table.
- **Timeline and inspector** (`.rhythm-chart`, `.block-inspector`): SVG pulses, accessible chart description, native selection range with block-specific value text, and a named inspector group. Manual selection has a stable polite announcement. Table buttons and the slider provide keyboard equivalents to selecting the SVG.
- **Playback controls** (`.primary-button`, `.icon-button`, `.scrubber`, `.playback-options`): one mint primary action. Play/pause, restart, native range, native speed select and return-to-feed states live in `App`. Playback disables while data is unavailable and pauses when the page becomes hidden.
- **Table pattern** (`.recent`, `.table-wrap`, `.table-footer`): semantic table with column headers; row block buttons select details, a secondary chevron repeats that action. Five rows initially, with an explicit expand/collapse action. Empty filters name the selected level and offer Show all activity.
- **Connection states** (`src/useBlocks.ts`, `.connection-notice`, `.chart-loading`): visible loading explanation; persistent sample/stale/error notice and Retry live; local fallback with provenance. Retry is disabled while pending. Connection changes use a stable status region.
- **Guide** (`.guide`): explanatory activity key and native `details`/`summary` disclosure. No custom focus management is needed.

Shared keyboard focus is a 2px solid `--focus` outline with a 4px offset. Hover styles only run for hover-capable pointers. With no reduced-motion preference, buttons use 150ms named transitions and scale to 0.96 on press; the active beat has a 650ms glow. Reduced motion removes these animations and transitions; manual replay remains a static selection sequence. Forced-colors overrides preserve native system colors and outlines; this variant has source coverage but no manual OS-level verification.

## Do's and Don'ts

- Start related surfaces inside `.page-shell`, reuse `.panel`, and align their headings and contents with the existing insets.
- Use the mint filled style for the main action. Use neutral outlined or text treatments for secondary actions, and preserve explicit state labels.
- Keep current values tabular and visible. Use the existing RPC-derived classifications and units consistently across chart, inspector and table.
- Preserve the clearly labeled sample state and fixed replay snapshot. Never animate invented blocks as live network data.
- Keep required assets local and Vite's relative base. Adding a second page would require a static export or in-page/hash navigation; this implementation provides no server routing.
- Add another panel by reusing its heading, body and existing control patterns, with a semantic heading and keyboard-operable controls. Do not introduce a separate icon set, font stack, wallet flow or gratuitous animation.
