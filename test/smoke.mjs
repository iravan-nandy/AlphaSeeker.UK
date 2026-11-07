/* End-to-end render smoke test.
 *
 * Loads the real index.html into a DOM, serves data/ and js/ off disk, stubs
 * only the TradingView network call, and drives the actual entry point. Asserts
 * the grid really renders with real prices and real signals.
 *
 * Requires jsdom. It is intentionally NOT a committed dependency -- the rest of
 * the suite (arch.mjs, golden.mjs) is zero-install and runs in CI. Get it with:
 *     npm install --no-save jsdom
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch { console.log('SKIP smoke test: jsdom not installed (npm install --no-save jsdom)'); process.exit(0); }

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;

// Serve same-origin fetches from disk; stub the one third-party call.
let tvCalls = 0;
window.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('scanner.tradingview.com')) {
    tvCalls++;
    // TV_DOWN exercises the resilience claim: in the monolith a TradingView
    // failure meant no prices at all, because it was phase 1 of the pipeline.
    // Now history comes first, so an outage should cost only intraday freshness.
    if (process.env.TV_DOWN) throw new Error('simulated TradingView outage');
    const body = JSON.parse(opts.body);
    return { ok: true, json: async () => ({
      data: body.symbols.tickers.map(t => ({
        s: t, d: [111.11, 1.5, 1.6, 1234567, 1000000, 100, 90, 1.2, 'USD', 1795608000],
      })),
    })};
  }
  const rel = u.replace('http://localhost:8080/', '');
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) return { ok: false, status: 404, statusText: 'Not Found' };
  const text = readFileSync(p, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
};

for (const k of ['window','document','fetch','Node','Element','HTMLElement','CustomEvent',
                 'localStorage','location','navigator','getComputedStyle','requestAnimationFrame'])
  globalThis[k] = window[k] ?? globalThis[k];
globalThis.window = window;
globalThis.document = window.document;
globalThis.fetch = window.fetch;
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: window.crypto });

if (!existsSync(path.join(ROOT, 'data/snapshot.json'))) {
  console.log('SKIP smoke test: data/snapshot.json missing (run scripts/fetch_prices.py first)');
  process.exit(0);
}

await import(pathToFileURL(path.join(ROOT, 'js/app/main.js')).href);
// let the two awaited phases settle
for (let i = 0; i < 40; i++) await new Promise(r => setTimeout(r, 25));

const doc = window.document;
const cards = doc.querySelectorAll('.stock-card');
const prices = [...doc.querySelectorAll('.card-price')].map(e => e.textContent.trim());
const withPrice = prices.filter(p => /^\$[\d,]+\.\d\d$/.test(p));
const badges = [...doc.querySelectorAll('.sig-badge-val')].map(e => e.textContent.trim());
const naBadges = badges.filter(b => b === 'N/A' || b === 'Data unavailable');
const taRows = doc.querySelectorAll('.card-ta-row');
const withRisk = [...doc.querySelectorAll('.card-ta-row')].filter(e => e.textContent.includes('⛔'));
const macro = doc.querySelectorAll('#macroTiles .mtile');
const regime = doc.getElementById('mrBadge')?.textContent.trim();

console.log(`cards rendered      : ${cards.length}`);
console.log(`cards with a price  : ${withPrice.length}`);
console.log(`signal badges       : ${badges.length} (N/A or unavailable: ${naBadges.length})`);
console.log(`TA rows             : ${taRows.length}  (with stop/target: ${withRisk.length})`);
console.log(`macro tiles         : ${macro.length}   regime: ${regime}`);
console.log(`TradingView calls   : ${tvCalls}`);
console.log(`status bar          : ${doc.getElementById('liveStatus')?.textContent} | ${doc.getElementById('dataTime')?.textContent}`);

assert.equal(cards.length, 84, 'all 84 cards should render');
assert.equal(withPrice.length, 84, 'every card should show a formatted price');
assert.equal(naBadges.length, 0, 'no card should show N/A — that means the stats got no history');
assert.ok(taRows.length >= 80, 'TA row (RSI/levels/vol) should render on essentially every card');
assert.equal(macro.length, 7, 'all 7 macro tiles should render');
// "Neutral / Mixed" is a legitimate market read, so asserting a particular
// regime would be asserting the market. What the snapshot change actually
// fixed is that trendOf() now HAS history: before, every macro tile carried
// closes:[] and the "% vs 21EMA" line was always blank.
const trendLines = [...doc.querySelectorAll('#macroTiles .t-tr')]
  .map(e => e.textContent.trim()).filter(s => /vs 21EMA/.test(s));
assert.ok(trendLines.length >= 6,
  `macro tiles should show a 21 EMA trend (got ${trendLines.length}/7) — ` +
  'if this is 0 the tiles lost their price history again');
const note = doc.getElementById('macroNote')?.textContent || '';
assert.ok(!/unavailable/.test(note), `macro note should be a real read, got: ${note}`);
assert.ok(tvCalls >= 1, 'the live-quote overlay should have been attempted');
if (process.env.TV_DOWN) {
  assert.equal(doc.getElementById('liveStatus').textContent, 'last close',
    'with TV down the status bar should say so rather than claiming live prices');
}

// modal opens and computes
const { openModal } = await import(pathToFileURL(path.join(ROOT, 'js/ui/modal.js')).href);
openModal('NVDA');
await new Promise(r => setTimeout(r, 50));
assert.ok(doc.getElementById('stockModal').classList.contains('open'), 'modal should open');
const lvl = doc.getElementById('precLevelsBox')?.textContent || doc.body.textContent;
assert.ok(/Support|Resistance|Volatility/.test(lvl), 'levels box should populate');
console.log('modal               : opens, levels box populated');

console.log('\nSMOKE OK');
