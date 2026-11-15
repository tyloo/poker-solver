# Poker Solver

A mobile-first study and quick-check tool for No-Limit Texas Hold'em tournaments, built for live 8-max games. It runs entirely in the browser, installs as an app, and works offline. There's no backend, no account, and nothing is stored on the device.

The app is in English and French.

## Tools

- **Advisor**: enter your hand, Position, stack and the action before you, and get the Chart's answer for that exact hand, with a verdict and the size to use. Postflop, it shows your equity against estimated ranges, pot odds, required equity and SPR, with a heuristic verdict and a link to open the Spot in the Solver.
- **Equity**: 2 to 8 players, each a specific hand, a range or random, on any board with dead cards. It counts every runout exactly when that's feasible and uses Monte Carlo otherwise.
- **Ranges**: browse the preflop Charts by Situation, Position and Stack tier on a 13×13 grid, plus push/fold grids that show the largest stack at which each hand still pushes or calls. A scratchpad lets you paint frequencies and copy the range string.
- **Solver**: a heads-up postflop GTO solver (discounted CFR) for turn and river Spots, and small flop Spots. Pick a preflop line to fill both ranges from the Charts, then browse the strategy, the game tree, and combos, EV and equity per hand.
- **Glossary**: plain explanations of every poker term the app uses.

The heavy maths (equity, solving) runs in Web Workers, so the page stays responsive on a phone.

## Game model

- No-Limit Hold'em, 8-max (UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB). Short-handed tables drop the earliest Positions first.
- No antes. The default Blind structure starts at 10,000 chips with levels 50/50, 50/100, 100/200, … and keeps doubling.
- Stack tiers: 33bb and up use the 40bb+ Charts, 21–32bb the 25bb Charts, 15–20bb the 15–20bb Charts, and below 15bb push/fold Charts apply.
- Push/fold Charts are a chip-EV Nash equilibrium (no ICM) for 1 to 15bb, computed by a script in this repo. Heads-up results match published Nash charts.

The seeded Open, Vs open and Vs limpers Charts are common baseline ranges, marked as starting points to tune from your own results. See [`docs/adr/0002-charts-live-in-the-repo.md`](docs/adr/0002-charts-live-in-the-repo.md).

## Getting started

Requirements: Node.js 24 or newer and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev
```

Then open http://localhost:3000.

| Command                   | What it does                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                | Development server                                                               |
| `pnpm build`              | Static export to `out/`, then writes the offline precache list into `out/sw.js`  |
| `pnpm test`               | Vitest suite (poker maths against reference values, plus UI logic)               |
| `pnpm type-check`         | TypeScript check                                                                 |
| `pnpm lint`               | Biome lint and format check                                                      |
| `pnpm format`             | Biome format                                                                     |
| `pnpm generate:push-fold` | Recomputes the push/fold Charts in `content/charts/` (deterministic, about 10 s) |

The service worker only registers in production builds. To try the installable, offline app, run `pnpm build` and serve `out/` with any static file server.

## Deploying

`pnpm build` produces a fully static site in `out/`. Host it anywhere that serves static files over HTTPS (Vercel, Netlify, GitHub Pages, Cloudflare Pages, …).

## Editing the Charts

Charts are TypeScript files in [`content/charts/`](content/charts), written as range strings with optional frequencies:

```ts
CO: { raise: "22+, A2s+, KTs+, AJo+, KQo, ATo:0.5" },
```

Fold is the remainder. Invalid strings, overlapping hands, or frequencies summing above 1 fail `pnpm test` and `pnpm build`. The Tight and Loose Player types live in [`content/player-types/`](content/player-types), and the Blind structure in [`content/blind-structure.ts`](content/blind-structure.ts).

Don't edit `content/charts/push.ts` or `vs-push.ts` by hand; run `pnpm generate:push-fold` instead.

## Project layout

```
app/          Next.js App Router pages; (en)/ and fr/ are the two language trees
components/   Shared UI (playing card, range grid, sheets, keypad, buttons)
content/      Repo data: Charts, Player types, Blind structure, Glossary terms
lib/poker/    Cards, Combos, hand evaluator, range strings, table and blinds
lib/equity/   Equity engine and worker
lib/charts/   Chart model, lookup and validation
lib/push-fold/ Push/fold Nash solver used by the generator script
lib/solver/   Game tree, discounted CFR, exploitability, worker and client
lib/advisor/  Advisor logic
lib/i18n/     English and French dictionaries
scripts/      Push/fold generator, precache list, icon generator
docs/adr/     Architecture decisions
```

`GLOSSARY.md` defines the domain vocabulary used in the code (Hand class, Combo, Chart, Situation, Spot, …).

## Tech

Next.js 16 (App Router, static export, React Compiler), React 19, TypeScript, Tailwind CSS v4, Vitest and Biome. There are no runtime dependencies beyond Next.js and React. The solver is pure TypeScript, without WebAssembly; see [`docs/adr/0001-pure-typescript-solver.md`](docs/adr/0001-pure-typescript-solver.md).

## Acknowledgements

- Discounted CFR: Noam Brown and Tuomas Sandholm, _Solving Imperfect-Information Games via Discounted Regret Minimization_ (AAAI 2019).
- The vectorized range-vs-range evaluation follows the approach of [postflop-solver](https://github.com/b-inary/postflop-solver).
- Heads-up push/fold reference values used to check the generator come from [HoldemResources](https://www.holdemresources.net/) Nash charts.
- Fonts: [Big Shoulders](https://fonts.google.com/specimen/Big+Shoulders) and [Atkinson Hyperlegible Next](https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next), under the SIL Open Font License.

## Disclaimer

This is a study tool. Its Charts are starting points, and its postflop verdicts are heuristics. Check your local rules before using any tool at the table.

## License

[MIT](LICENSE)
