# Alpha Seeker

A static, client-side stock screener. Two "desks" (Precision = pullback entries,
Momentum = breakout entries) score a themed universe of ~84 tickers using a
per-stock backtested edge profile plus a rules ladder.

No backend, no database, no build step. GitHub Pages serves plain HTML, CSS and
ES modules; market data is baked into a JSON snapshot ahead of time by a
scheduled workflow.

```
index.html          markup only
css/                8 stylesheets, loaded in a fixed order (see below)
js/core/            pure helpers: numbers, formatting, pub/sub
js/stats/           statistics — no DOM, no network, no clock
js/strategy/        the algorithm — the researcher-facing surface
js/data/            providers + the published-data schema
js/ui/              rendering
js/app/             entry point, pipeline, delegated event registry
data/universe.json  the symbol list
scripts/            the server-side data build (Python 3 stdlib)
test/               regression lock + architecture guardrails
legacy/             the original single-file app, frozen as the test baseline
```

## Running it locally

```bash
EODHD_API_KEY=xxxx python3 scripts/fetch_prices.py --cache   # build data/snapshot.json
python3 -m http.server 8080
open http://localhost:8080/
```

ES modules need a real origin — opening `index.html` as a `file://` URL will
not work, and the page says so.

## Where the data comes from

No free market-data API can be called directly from a browser at this scale.
Measured 2026-09-29:

| Source | Result |
|---|---|
| `scanner.tradingview.com` | works, CORS OK, keyless |
| `eodhd.com/api/eod` | data OK but **no** `Access-Control-Allow-Origin` |
| `query1/2.finance.yahoo.com` | HTTP 200, no CORS header |
| `api.allorigins.win` | 522 |
| `api.codetabs.com` | 503 |
| `corsproxy.io` (keyless) | 403, anonymous use discontinued |
| `stooq.com` | JS anti-bot challenge, no CORS |

So history is fetched **server-side** by `.github/workflows/data.yml`, which
runs `scripts/fetch_prices.py` with the API key held in the `EODHD_API_KEY`
repository secret and publishes the result as a Pages artifact. The browser
makes one same-origin request for `data/snapshot.json` (~315 KB gzipped,
520 trading days x 91 symbols) instead of up to 13 requests per ticker.

The TradingView scanner then overlays today's live price and next-earnings date
in one keyless POST. That call is best-effort: if it fails the page still shows
every signal computed off the last close, labelled `last close`. In the original
this was inverted — TradingView was phase 1, so its failure meant no prices at
all.

`data/snapshot.json` is **not** committed. It is regenerated every weekday, and
~700 KB of float JSON rewritten 252 times a year would add roughly 100 MB of
permanent git history that never shrinks.

### Supplying data by hand

Anything in `data/overrides/<SYMBOL>.json` is committed and **wins over the
vendor**. Use it for a ticker the vendor does not carry, to patch a bad bar, or
to ship a synthetic series. Same row shape as the vendor:

```json
[{"date":"2026-09-28","open":1,"high":2,"low":0.5,"close":1.5,"adjusted_close":1.5,"volume":1000}]
```

### Adding symbols

Edit `data/universe.json` and commit. The next workflow run picks them up.

Symbols can also come from **GitHub issues**: `scripts/resolve_symbols.py`
unions `universe.json` with every open issue labelled `portfolio` that contains
a fenced ` ```json ` or ` ```yaml ` block, and the workflow re-runs on issue
events so a new portfolio gets data within minutes.

````markdown
```json
{ "symbols": ["NVDA", "AMD", "TSM"] }
```
````

Two constraints worth knowing:

- It must be in the issue **body**, not an attachment. Attachments are served
  from `github.com`, which sends no CORS header, so the browser could never
  read them either.
- Only issues whose `author_association` is `OWNER`, `MEMBER` or `COLLABORATOR`
  are honoured. Anyone can open an issue, so the label alone is not an
  authorization boundary.

## Changing the algorithm

Two files, and you should not need to touch anything else.

**`js/strategy/setups.js`** — the entry predicates the per-stock backtest scans
for. Add one object:

```js
{ key:'rsi30', name:'dips under RSI 30', short:'RSI<30 dip',
  test: (i, x) => x.rsi[i] != null && x.rsi[i-1] != null
                  && x.rsi[i] < 30 && x.rsi[i-1] >= 30 }
```

`x` is `{ c, rsi, e21, e50, e200, m200 }` — closes plus precomputed series,
each aligned to the same index. Return `true` when the setup triggers on bar `i`.

**`js/strategy/params.js`** — the tunables: forward horizon, the minimum
occurrence count and win rate a setup must clear, and the earnings blackout
window.

> **Read the backtest for what it is.** `profileStock` is an **in-sample** event
> study over that stock's own history, with no transaction costs, no slippage,
> and a low bar (`HS_MIN_N = 6` occurrences). The "+X% avg, Y% win rate" figures
> in the UI are a statistical tilt, not an out-of-sample result.

## Tests

```bash
node test/arch.mjs            # architecture guardrails
node test/extract-legacy.mjs  # rebuild the baseline from legacy/
node test/golden.mjs          # statistics regression lock
npm install --no-save jsdom && node test/smoke.mjs   # full render (optional)
```

`golden.mjs` is the important one. The brief was to reorganise the statistics
**without changing them**, so the test runs the original functions — lifted
straight out of `legacy/Alpha-Seeker.html` — and the refactored modules over 26
fixtures x 5 earnings cases and asserts the output is byte-identical. It also
fails if the fixtures stop reaching all 10 precision and 9 momentum branches,
because bit-identity only proves what actually executed.

`arch.mjs` enforces the boundaries that keep this from collapsing back into one
file: `js/stats/**` and `js/strategy/**` stay free of DOM, network, clock and
state; `js/app/load.js` imports no UI; `js/ui/modal.js` does not import
`grid.js`; no inline `on*` handlers; `responsive.css` stays last.

## Things that are not what they look like

**The premium gate is cosmetic.** Everything runs in the visitor's browser on
data their browser already has. `js/auth/entitlements.js` keeps that in one
place and hashes the admin passphrase instead of shipping it in plaintext, but
that is obfuscation, not security. Making it real needs a server issuing a
signed token. Note that pure-static GitHub OAuth is not an option —
`github.com/login/oauth/access_token` sends no CORS header — so the realistic
choices are a pasted personal access token validated against `api.github.com`,
or one small serverless function.

**CSS order is load-bearing.** There is not a single `!important` in the
project, so every override is source order. `css/responsive.css` must stay last;
`arch.mjs` enforces it.

**Rotate the EODHD token.** The original `Alpha-Seeker.html` shipped a live API
token in source and forwarded it to three public CORS proxies. It is redacted in
`legacy/` but remains in commit `c51d3ff`, so it must be rotated at the provider.
