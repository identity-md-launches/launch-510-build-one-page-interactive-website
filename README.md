# Block Rhythm

A one-page Ethereum activity visualizer built with React, TypeScript and Vite. Each block becomes a pulse whose height and brightness combine transaction count and total gas used. No wallet, credentials, signatures or backend are needed.

## Run locally

Use Node.js **22.12+** (validation used Node 24.21.0).

```sh
npm ci
npm run dev
```

To rebuild and preview the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Open the URL printed by Vite. Serve the site over HTTP(S); opening `index.html` directly with `file://` does not provide a reliable fetch environment.

## Publish

The ready-to-host export is **`dist/`**, delivered alongside the source and `package-lock.json`. Publish the **contents of that directory**, including `assets/`, `fonts/`, `licenses/`, `favicon.svg` and `sample-blocks.json`. No build service, server rewrite, API key or environment file is required. Vite uses `base: './'`; the export was tested at `/preview/`, so gateway subpaths work. There is one page with in-page anchors.

Rebuild whenever source or public assets change, and include the resulting `dist/` in the next submission. Do not deploy source alone: the publisher serves the provided static files. `dist/` is deliberately not ignored.

## Use the visualizer

- **Live feed:** retrieves 50 recent Ethereum execution blocks and polls every 12 seconds while the page is visible. Summary cards use the latest live window, even during replay.
- **Inspect:** select a pulse, use the labeled block slider (arrow keys, Home and End), or select a recent block. The inspector shows transactions, total gas and activity, with an Etherscan link.
- **Filter:** All blocks, Low, Medium and High narrow the recent list and dim other pulses. Keeping the full timeline preserves block order. An empty filter has a recovery action.
- **Replay:** Play last 50 freezes a 50-block snapshot and advances oldest to newest. Pause/resume, restart, scrub, change speed, and return to the feed. At 1×, each step lasts 650 ms; this is compressed, evenly paced, **silent visual playback**, not historical wall-clock timing. Replay includes all 50 blocks regardless of the filter.
- **Connection recovery:** a failed refresh retains the last successful live window and shows a connection warning. If the initial live request fails, a clearly labeled saved snapshot keeps the visualizer usable. Retry live reconnects. If both sources fail, loading ends with a recoverable error. Sample mode never invents new blocks.

The fallback contains actual blocks **26,089,781–26,089,830**, captured from PublicNode on **2026-09-30 at 10:55:04 UTC**. Source and capture metadata are in `public/sample-blocks.json`. It is a historical sample, not simulated live data.

## Data and metrics

`src/data.ts` uses the public, unauthenticated endpoints `https://ethereum-rpc.publicnode.com` and `https://eth.drpc.org` via the standard [`eth_getBlockByNumber` JSON-RPC method](https://ethereum.org/developers/docs/apis/json-rpc/#eth_getblockbynumber). Requests return transaction hashes, not full transaction objects. Initial history is fetched in batches of ten. Requests have a nine-second timeout, malformed or incomplete responses are rejected, and the secondary provider is attempted on failure. Subsequent refreshes reuse older history and reload the newest three blocks to cover shallow reorganizations.

Average block time is the timestamp span divided by 49. Transactions and gas are arithmetic per-block means; capacity is the mean of each block's gas-used/gas-limit percentage. Activity is `0.5 × min(txns / 400, 1) + 0.5 × min(gasUsed / 30,000,000, 1)`: low below 0.35, medium from 0.35 to below 0.65, high at or above 0.65. These fixed visual reference levels are **not** protocol limits or congestion estimates. Exact values remain available alongside the visualization.

Public providers can rate-limit, deny CORS or become unavailable. The app makes read-only requests from the browser; it cannot guarantee provider availability or canonical/finalized data. Reloading the newest three blocks is not a full deep-reorganization verifier. No account information is requested or persisted.

## Validate

```sh
npx playwright install chromium
npm run build
npm run typecheck
npm test
```

`tests/interaction.mjs` starts and closes its own HTTP preview, uses a deterministic 50-block RPC fixture, and tests metrics, filters, inspection, all 50 replay steps, pause, speed, keyboard scrubbing, live polling, error recovery, sample fallback, empty states, reduced motion, responsive reflow and an axe accessibility scan. It writes actual results into `artifacts/`. The real public feed was checked separately in the browser.

**Worker results:** production build and TypeScript check passed; the interaction results and final counts are in [artifacts/validation.md](artifacts/validation.md) and [artifacts/interaction-results.json](artifacts/interaction-results.json). The six-domain Better Interface review, fixes, measured contrast pairs and unperformed checks are recorded there. These are worker checks, not independent certification.

To honor this assignment's path restrictions, worker dependencies and npm caches were installed under `/tmp`, with no repository `node_modules/`. `BLOCK_RHYTHM_DEPS` optionally points Vite and the test runner to such an external installation. Typechecking used a temporary config extending `tsconfig.json` with external React type paths. Normal `npm ci` and the scripts above do not need that override. The final validation document records the exact worker commands.

## Source and design

- `src/App.tsx`: page composition, timeline, inspector, replay and filters.
- `src/data.ts`: RPC validation, fetching, classification and statistics.
- `src/useBlocks.ts`: loading, polling, cancellation and fallback states.
- `src/icons.tsx`: local SVG icons and activity indicators.
- `src/styles.css`: design tokens, component styles and responsive behavior.
- [DESIGN.md](DESIGN.md): implemented design system.

Geist is bundled locally as a variable WOFF2 font under the [SIL OFL](public/fonts/OFL.txt). Runtime React code uses the [MIT license](public/licenses/react.txt). Better Interface guidance and the Impeccable documentation method are credited in [artifacts/licenses/NOTICE.md](artifacts/licenses/NOTICE.md), with both supplied licenses retained.

Submission budget: **8,388,608 bytes**. `.gitignore` has an explicit **1,024-byte path budget**, excludes dependency/cache folders at any depth and local scratch/browser files, and preserves `dist/`. The final file inventory and byte totals are in `artifacts/submission-size.json`. Dependencies, registry archives and submodules are not delivered.
