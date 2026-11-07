/* Deterministic fixtures chosen to drive every branch of the signal engine.
   Real bars come from data/snapshot.json when present so the numbers are
   realistic; the synthetic cases exist to reach edges real data rarely hits. */
import { readFileSync, existsSync } from 'node:fs';
import { calcEMA } from '../js/stats/ma.js';

/* Real bars come from a COMMITTED slice, not from data/snapshot.json, which is
   generated and gitignored. The regression lock has to be reproducible from a
   clean checkout -- otherwise CI silently loses the real-data fixtures and with
   them the branches only real price action reaches.
   Refresh with scripts/make_test_bars.py. */
const BARS = new URL('./fixtures/bars.json', import.meta.url);
const snap = existsSync(BARS) ? JSON.parse(readFileSync(BARS, 'utf8')) : null;

function real(sym, n) {
  const e = snap?.symbols?.[sym];
  if (!e) return null;
  const c = e.c.filter(v => v != null).slice(-n);
  const v = e.v.filter(x => x != null).slice(-n);
  return c.length >= Math.min(n, 30) ? { closes: c, volumes: v } : null;
}

// Reproducible PRNG so synthetic series never shift between runs.
let seed = 20260929;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function walk(n, start, drift, vol) {
  const c = [], v = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    p = Math.max(0.5, p * (1 + drift + (rnd() - 0.5) * vol));
    c.push(+p.toFixed(4));
    v.push(Math.round(1e6 * (0.6 + rnd())));
  }
  return { closes: c, volumes: v };
}

export function buildFixtures() {
  const F = [];
  const add = (name, o) => o && F.push({ name, ...o });

  // --- length / null-tolerance boundaries in generateSignals + profileStock ---
  add('len-0',            { closes: [], volumes: [] });
  add('len-29-too-short', walk(29, 50, 0.001, 0.03));            // < 30 -> early return
  add('len-45-no-ema50',  walk(45, 50, 0.001, 0.03));            // ema50 null
  add('len-119-no-profile', walk(119, 50, 0.002, 0.03));         // profileStock -> null
  add('len-260-ema200',   walk(260, 50, 0.002, 0.03));

  // --- trend regimes ---
  add('uptrend-520',   walk(520, 20, 0.0035, 0.035));
  add('downtrend-520', walk(520, 300, -0.0025, 0.04));
  add('flat-520',      walk(520, 100, 0.0000, 0.015));

  // --- null handling: this is what separates calcEMA from emaSeries ---
  const gap = walk(300, 80, 0.002, 0.03);
  [5, 17, 40, 41, 42, 120, 250].forEach(i => { gap.closes[i] = null; gap.volumes[i] = null; });
  add('embedded-nulls', gap);

  // --- high20/low20 become -Infinity/Infinity when the last 20 are all null ---
  const tail = walk(200, 60, 0.001, 0.03);
  for (let i = tail.closes.length - 20; i < tail.closes.length; i++) tail.closes[i] = null;
  add('null-last-20', tail);

  // --- a constructed failed-breakdown/reclaim so detectReclaim fires ---
  const rc = walk(400, 100, 0.0015, 0.02);
  const last = rc.closes.length - 1;
  for (let k = 8; k >= 1; k--) rc.closes[last - k] = +(rc.closes[last - 9] * 0.90).toFixed(4);
  rc.closes[last] = +(rc.closes[last - 9] * 1.06).toFixed(4);
  add('reclaim', rc);

  // --- volume-dry-up and volume-surge drive the volRatio branches ---
  const dry = walk(300, 75, 0.002, 0.02);
  for (let i = dry.volumes.length - 5; i < dry.volumes.length; i++) dry.volumes[i] = 300000;
  add('volume-dryup', dry);
  const surge = walk(300, 75, 0.003, 0.02);
  for (let i = surge.volumes.length - 5; i < surge.volumes.length; i++) surge.volumes[i] = 9000000;
  surge.closes[surge.closes.length - 1] = Math.max(...surge.closes.slice(-20)) * 1.001;
  add('volume-surge', surge);

  // --- extension branches: price far above / far below the 21 EMA ---
  const ext = walk(300, 100, 0.001, 0.02);
  ext.closes[ext.closes.length - 1] = +(ext.closes[ext.closes.length - 2] * 1.18).toFixed(4);
  add('over-extended', ext);
  const dip = walk(300, 100, 0.001, 0.02);
  dip.closes[dip.closes.length - 1] = +(dip.closes[dip.closes.length - 2] * 0.94).toFixed(4);
  add('approaching', dip);

  // --- branches the cases above do not reach ---

  // PRECISION LONG: price parked within -3%..+2% of the 21 EMA, volume drying,
  // and above the 200 MA. Built by flattening the tail onto its own average.
  const prec = walk(300, 40, 0.0030, 0.012);
  {
    const n = prec.closes.length;
    const base = prec.closes[n - 22];
    for (let i = n - 21; i < n; i++) prec.closes[i] = +(base * (1 + (i - (n - 21)) * 0.0004)).toFixed(4);
    for (let i = n - 5; i < n; i++) prec.volumes[i] = 250000;
    for (let i = n - 20; i < n - 5; i++) prec.volumes[i] = 1200000;
  }
  add('precision-long', prec);

  // TOO EXTENDED (pct21 >= 10). Two branches sit in front of it and both had
  // to be dodged: profileStock's edge short-circuits the whole ladder, so this
  // stays under 120 bars; and detectReclaim fires on any dip below the 50 EMA
  // in the last 10 bars, so the tail is a clean monotonic ramp that never dips.
  const blow = walk(110, 100, 0.0005, 0.010);
  {
    const n = blow.closes.length;
    const e50 = calcEMA(blow.closes.slice(0, n - 15), 50);
    let p = e50 * 1.06;                       // start clear of the 50 EMA
    for (let i = n - 15; i < n; i++) { p *= 1.025; blow.closes[i] = +p.toFixed(4); }
  }
  add('too-extended', blow);

  // VOLUME SURGE: heavy volume above the 21 EMA but NOT near 20-day highs,
  // which is what separates it from MOMENTUM LONG.
  // VOLUME SURGE needs three things at once: volRatio > 1.5, price ABOVE the
  // 21 EMA, and price NOT within 3% of the 20-day high. Satisfying all three
  // means threading a needle, so solve for the final close numerically rather
  // than guessing a multiplier.
  const vs = walk(110, 90, 0.0015, 0.02);
  {
    const n = vs.closes.length;
    const peak = vs.closes[n - 20] * 1.25;
    vs.closes[n - 20] = +peak.toFixed(4);                       // a high to fall away from
    for (let i = n - 19; i < n; i++) vs.closes[i] = +(peak * 0.88).toFixed(4);
    const ema = calcEMA(vs.closes.slice(0, n - 1), 21);
    const hi20 = Math.max(...vs.closes.slice(-20));
    // just above the EMA, comfortably below the 20-day high
    vs.closes[n - 1] = +Math.min(ema * 1.004, hi20 * 0.95).toFixed(4);
    for (let i = n - 5; i < n; i++) vs.volumes[i] = 8000000;
    for (let i = n - 20; i < n - 5; i++) vs.volumes[i] = 1000000;
  }
  add('volume-surge-midrange', vs);

  // --- real market data ---
  for (const sym of ['NVDA', 'IONQ', 'OKLO', 'LMT', 'MSTR', 'HIMS', 'ASML', 'SPY']) {
    add(`real-${sym}`, real(sym, 520));
  }
  return F;
}

/* Pinned clock: earningsDays() calls Date.now(), so the gate would otherwise
   produce a different answer on every run. */
export const NOW_MS = Date.parse('2026-09-29T14:00:00Z');
export const EARNINGS_CASES = [null, { date: '2026-10-02' }, { date: '2026-09-25' },
                               { date: '2026-11-20' }, { date: 'not-a-date' }];
