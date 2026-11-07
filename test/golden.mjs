/* Bit-identity regression lock for the statistics and signal engine.
 *
 * Runs the ORIGINAL functions (lifted out of Alpha-Seeker.html by
 * test/extract-legacy.mjs) and the refactored modules over identical fixtures
 * and asserts the outputs are byte-identical.
 *
 * The requirement was to reorganise the statistics without changing them. This
 * is what makes that claim checkable rather than asserted: every formula --
 * Wilder RSI/ATR smoothing, the n-1 sample stdev, the G2 excess-kurtosis
 * correction, the RiskMetrics lambda=0.94 EWMA recursion -- must produce the
 * same number to the last bit.
 *
 *   node test/golden.mjs            compare modules against the monolith
 *   node test/golden.mjs --write    refresh test/golden/baseline.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { buildFixtures, NOW_MS, EARNINGS_CASES } from './fixtures.mjs';

import * as legacy from './.legacy.mjs';
import * as ma       from '../js/stats/ma.js';
import * as rsi      from '../js/stats/rsi.js';
import * as pivots   from '../js/stats/pivots.js';
import * as atr      from '../js/stats/atr.js';
import * as vol      from '../js/stats/vol.js';
import * as levels   from '../js/stats/levels.js';
import * as statsIdx from '../js/stats/index.js';
import * as num      from '../js/core/num.js';
import * as profile  from '../js/strategy/profile.js';
import * as signals  from '../js/strategy/signals.js';
import * as risk     from '../js/strategy/risk.js';
import * as earnings from '../js/strategy/earnings.js';
import { S } from '../js/state/store.js';

const NEW = { ...num, ...ma, ...rsi, ...pivots, ...atr, ...vol, ...levels,
              ...statsIdx, ...profile, ...signals, ...risk, ...earnings };

/* ---- serializer -------------------------------------------------------
   JSON.stringify of a JS float is the shortest round-tripping form, so plain
   JSON is already bit-exact for numbers. What it is NOT safe for is the
   non-JSON values this code genuinely produces: high20/low20 become
   +/-Infinity when the last 20 closes are all null, and -0 is distinguishable
   from 0 only via Object.is. Keys are sorted so property insertion order is
   not silently part of the assertion. */
function enc(v) {
  if (v === undefined) return '__undef';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '__NaN';
    if (v === Infinity) return '__Inf';
    if (v === -Infinity) return '__-Inf';
    if (Object.is(v, -0)) return '__-0';
    return v;
  }
  if (typeof v === 'function') return '__fn';
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = enc(v[k]);
    return o;
  }
  return v;
}
const ser = v => JSON.stringify(enc(v));

/* ---- branch coverage --------------------------------------------------
   Bit-identity only proves what actually executed. generateSignals has 12
   precision labels and 7 momentum labels; if a fixture set stops reaching some
   of them, the lock quietly weakens. Fail loudly instead. */
const seenPrec = new Set(), seenMom = new Set();

function run(mod, f, earn) {
  const { closes, volumes } = f;
  const price = (() => { for (let i = closes.length - 1; i >= 0; i--) if (closes[i] != null) return closes[i]; return null; })();
  const out = {};
  out.cleanNums     = mod.cleanNums(closes).length;
  out.calcEMA21     = mod.calcEMA(closes, 21);
  out.calcEMA200    = mod.calcEMA(closes, 200);
  out.calcAvgVol20  = mod.calcAvgVol(volumes, 20);
  out.emaSeries21   = mod.emaSeries(closes, 21);
  out.smaSeries200  = mod.smaSeries(closes, 200);
  out.rsi           = mod.calcRSIseries(closes, 14);
  out.pivots        = mod.pivotIdx(closes, 3);
  out.divergence    = mod.detectDivergence(closes, out.rsi);
  out.logReturns    = mod.logReturns(mod.cleanNums(closes));
  out.stdev         = mod.stdev(out.logReturns);
  out.realizedVol20 = mod.realizedVol(out.logReturns, 20);
  out.ewmaVol       = mod.ewmaVol(out.logReturns, 0.94);
  out.skewness      = mod.skewness(out.logReturns.slice(-60));
  out.kurtosis      = mod.kurtosis(out.logReturns.slice(-60));
  out.volPercentile = mod.volPercentile(closes);
  out.detectReclaim = mod.detectReclaim(closes, mod.calcEMA(closes, 50), mod.calcEMA(closes, 200));
  out.fitLine       = mod.fitLine(closes.map((_, i) => i), closes.map(c => c == null ? 0 : c));
  out.profileStock  = mod.profileStock(closes);
  out.hsPrecision   = mod.hsPrecision(out.profileStock, f.name);

  const d = { price, closes, volumes, highs: null, lows: null, earnings: earn };
  out.trendlines = mod.trendlines(d);
  out.findLevels = mod.findLevels(d);
  out.computeVol = mod.computeVol(d);
  out.computeTA  = mod.computeTA(d);

  // ATR needs highs/lows; synthesise deterministically from closes.
  const highs = closes.map(c => c == null ? null : +(c * 1.012).toFixed(4));
  const lows  = closes.map(c => c == null ? null : +(c * 0.988).toFixed(4));
  out.calcATR = mod.calcATR(highs, lows, closes, 14);

  const sig = mod.generateSignals(price, closes, volumes, f.name);
  sig.ta = out.computeTA;
  const dr = { ...d, highs, lows };
  out.computeRisk = mod.computeRisk(dr, sig);
  sig.risk = out.computeRisk;

  // Earnings gate mutates in place through the module-level store.
  mod.S.data = { [f.name]: dr };
  mod.S.signals = { [f.name]: sig };
  mod.applyEarningsGate(f.name);
  // Record AFTER the gate: it rewrites strength>=4 labels to EARNINGS RISK,
  // so sampling before it would make that branch permanently unreachable.
  if (sig.precision?.label) seenPrec.add(sig.precision.label);
  if (sig.momentum?.label)  seenMom.add(sig.momentum.label);
  out.signals   = sig;
  out.earnDays  = dr.earnDays;
  out.earningsDays = mod.earningsDays(earn?.date);
  return out;
}

const realNow = Date.now;
Date.now = () => NOW_MS;                    // pin the clock for earningsDays
try {
  const fixtures = buildFixtures();
  const legacyMod = { ...legacy };
  const newMod    = { ...NEW, S };
  const report = {};
  let compared = 0, mismatches = [];

  for (const f of fixtures) {
    for (const earn of EARNINGS_CASES) {
      const key = `${f.name}|${earn ? earn.date : 'no-earnings'}`;
      let a, b;
      try { a = ser(run(legacyMod, f, earn)); }
      catch (e) { a = `__throw:${e.constructor.name}:${e.message}`; }
      try { b = ser(run(newMod, f, earn)); }
      catch (e) { b = `__throw:${e.constructor.name}:${e.message}`; }
      // Store a digest, not the payload: the raw dump is ~3.4 MB and would
      // dominate every diff. A SHA-256 per case is just as strict.
      report[key] = createHash('sha256').update(a).digest('hex');
      compared++;
      if (a !== b) mismatches.push({ key, a, b });
    }
  }

  console.log(`fixtures: ${fixtures.length} x ${EARNINGS_CASES.length} earnings cases = ${compared} comparisons`);

  if (mismatches.length) {
    console.error(`\n${mismatches.length} MISMATCH(ES) — the refactor changed the math:\n`);
    for (const m of mismatches.slice(0, 3)) {
      console.error(`  ${m.key}`);
      const A = JSON.parse(m.a), B = JSON.parse(m.b);
      for (const k of Object.keys(A)) {
        const sa = JSON.stringify(A[k]), sb = JSON.stringify(B[k]);
        if (sa !== sb) console.error(`    ${k}:\n      legacy ${String(sa).slice(0,140)}\n      module ${String(sb).slice(0,140)}`);
      }
    }
    process.exit(1);
  }
  console.log('OK  modules are bit-identical to the original monolith');

  // --- branch coverage gate ---
  const PREC = ['PRECISION LONG ⚡','RECLAIM ⚡','SELL ALERT 🚨','APPROACHING 👀','EXTENDED ⏸',
                'TOO EXTENDED 🚫','CAUTION ⚠','WATCH 🔍','EARNINGS RISK ⚠','N/A'];
  const MOM  = ['RECLAIM + HIGHS 🔥','MOMENTUM LONG 🔥','BUILD POSITION 📈','VOLUME SURGE ⚡',
                'WAIT 🕐','CAUTION ⚠','HOLD / WATCH','N/A','EARNINGS RISK ⚠'];
  const missP = PREC.filter(l => !seenPrec.has(l));
  const missM = MOM.filter(l => !seenMom.has(l));
  console.log(`branch coverage: precision ${seenPrec.size}/${PREC.length}, momentum ${seenMom.size}/${MOM.length}`);
  if (missP.length || missM.length) {
    // Hard gate. Bit-identity only proves what actually executed, so a fixture
    // set that stops reaching a branch silently weakens the lock.
    console.error(`\nUNREACHED BRANCHES: ${[...missP, ...missM].join(' | ')}`);
    console.error('Add fixtures in test/fixtures.mjs until every label is produced.');
    process.exit(1);
  }

  mkdirSync(new URL('golden/', import.meta.url), { recursive: true });
  const baseline = new URL('golden/baseline.json', import.meta.url);
  const text = JSON.stringify(report, null, 0);
  if (process.argv.includes('--write') || !existsSync(baseline)) {
    writeFileSync(baseline, text);
    console.log('baseline written:', (text.length / 1024).toFixed(0), 'KB');
  } else {
    assert.equal(text, readFileSync(baseline, 'utf8'), 'output drifted from test/golden/baseline.json');
    console.log('OK  matches the committed baseline');
  }
} finally {
  Date.now = realNow;
}
