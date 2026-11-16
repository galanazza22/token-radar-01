# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/galanazza22/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/galanazza22/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

**Token Radar** ranks the pre-token protocols of DeFi by what their launch would be worth, and
shows a reader how to farm each one. It reads a sealed snapshot of every protocol DefiLlama tracks
(758 protocols, 40 on the watchlist), scores each one with a stated value model, and writes a
static dashboard — a sortable, filterable board, a detail view for every protocol with its model
breakdown and farm plan, and a Live view that keeps the protocols whose token already trades apart.

Entered in [make.fun's Build the best token launch radar bounty](https://make.fun/bounty/token-radar-01)
($1,325 in rewards).

## The board

- **178 rows**: the 40 watchlist protocols plus 138 pre-token protocols below the $50M floor that
  pass the same exclusion rule (no token recorded; not a bridge, a liquid-staking or restaking
  product, a CEX, a versioned pool, a wrapped or staked product, or a protocol named after an
  exchange). Protocols above the floor that the watchlist leaves out are not ranked.
- **Implied value** follows only from the snapshot's own figures — TVL, seven-day growth, age,
  chain count and category — never from a list of names:

  `implied = TVL × 0.30 × growth × maturity × chains × category`

  Growth clamps the 7-day change to −50%…+150% (`1 + change × 0.006`); maturity runs 0.70–1.00
  over 1,460 days; each extra chain adds 0.02 (up to 1.10); the category factor runs 0.90–1.15.
  The dashboard states the formula and shows every row's factors.
- **Farm plans**: six concrete steps per protocol — what to do, what it costs, how long it takes —
  derived from the protocol's category, chains, TVL and age.

## Run it

```sh
# Build the board from the sealed snapshot (writes out/board.json, out/data.js,
# out/dashboard/, out/screenshots/ and out/dossier.json)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/input/snapshot.json

# Open the dashboard (serves out/ on http://localhost:8080)
python3 -m http.server 8080 --directory out
```

Views: the board (`dashboard/index.html`), a protocol's detail (`?view=detail&slug=<slug>`),
a filtered board (`?view=board&category=Dexs`), and the live-token view (`?tab=live`).
Node 22 or later, standard library only — nothing is installed, nothing is fetched.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes the board, data, dashboard and dossier
- `lib/model.ts` — the value model (radar-2), the board builder and the farm-plan generator
- `vendor/makefun-board.ts` — make.fun's dossier library, copied from the kit
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js` (no network)
- `screenshots/` — the board, a detail view and a filtered view

<sub>Entered on [make.fun](https://make.fun/?ref=s0zdek06&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
