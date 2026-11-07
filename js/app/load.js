/* Alpha-Seeker — app/load.js
   The data pipeline. Replaces the monolith's three-phase, six-worker fan-out
   (lines 1744-1878), which issued up to 13 racing requests per ticker against
   four CORS proxies. As of 2026-09-29 every one of those paths is dead:
   allorigins 522, codetabs 503, corsproxy.io keyless 403, and both EODHD and
   Yahoo send no Access-Control-Allow-Origin at all.

   Two phases now:
     1. One same-origin GET of data/snapshot.json -> full history for every
        symbol -> real signals -> render. The page is fully functional here,
        at the last close, with no third party involved.
     2. TradingView scanner (keyless, verified working) overlays today's live
        price and re-runs the signals.

   This inverts the old failure mode: previously a TradingView failure meant no
   prices at all; now it costs only intraday freshness.

   Imports no js/ui/** by design -- it announces results through the emitter,
   which is what keeps the grid <-> modal cycle out of the module graph. */

import { emit } from '../core/emitter.js';
import { STOCKS } from '../data/symbols.js';
import { S } from '../state/store.js';
import { loadSnapshot, seriesFor, stalenessDays } from '../data/providers/snapshot.js';
import { fetchPricesTradingView } from '../data/providers/tradingview.js';
import { computeTA } from '../stats/index.js';
import { generateSignals } from '../strategy/signals.js';
import { computeRisk } from '../strategy/risk.js';
import { applyEarningsGate } from '../strategy/earnings.js';

/** Recompute every derived value for one symbol from whatever is in S.data. */
function recompute(sym) {
  const d = S.data[sym];
  if (!d) return;
  const sig = generateSignals(d.price, d.closes, d.volumes, sym);
  sig.ta = computeTA(d);
  sig.risk = computeRisk(d, sig);
  S.signals[sym] = sig;
  applyEarningsGate(sym);
}

/**
 * Merge a live quote over snapshot history.
 *
 * Deliberately does NOT append the live price to `closes`: today's bar is
 * already absent from the snapshot, and appending it would double-count the
 * session and shift every profileStock occurrence by one bar. generateSignals
 * takes `price` as an argument distinct from the series precisely so the live
 * price can lead the history.
 *
 * Also carries forward beta / ma50 / ma200 / avgVolume, which the historical
 * feed does not return. The monolith had a bug here (its guard tested a source
 * tag that was never set, so these fields were wiped once history resolved,
 * breaking the beta badge); the explicit field list below is what prevents it.
 */
function applyLiveQuote(sym, q) {
  const d = S.data[sym];
  if (!d || !q || q.price == null) return false;
  d.price     = q.price;
  if (q.changePct != null) d.changePct = q.changePct;
  if (q.change    != null) d.change    = q.change;
  if (q.prevClose != null) d.prevClose = q.prevClose;
  if (q.volume    != null) d.volume    = q.volume;
  if (q.beta      != null) d.beta      = q.beta;
  if (q.ma50      != null) d.ma50      = q.ma50;
  if (q.ma200     != null) d.ma200     = q.ma200;
  if (q.avgVolume != null) d.avgVolume = q.avgVolume;
  if (q.currency  != null) d.currency  = q.currency;
  if (q.earnings  != null) d.earnings  = q.earnings;   // fresher than the snapshot's
  d.live = true;
  d.src  = 'snapshot+tv';
  return true;
}

export async function loadAll() {
  if (location.protocol === 'file:') {
    const b = document.getElementById('localBanner');
    if (b) b.style.display = 'block';
  }

  STOCKS.forEach(s => S.loading.add(s.sym));
  emit('grid:status', { text: 'Loading market data…' });

  // ---- Phase 1: history + real signals -------------------------------------
  let snap = null;
  try {
    snap = await loadSnapshot();
  } catch (e) {
    console.error('[AlphaSeeker] snapshot unavailable:', e);
    S.loading.clear();
    emit('grid:status', { text: 'Market data unavailable', error: true });
    emit('stocks:updated', { phase: 'snapshot', ok: 0 });
    return;
  }

  let have = 0;
  for (const stk of STOCKS) {
    const d = seriesFor(snap, stk.sym);
    S.loading.delete(stk.sym);
    if (!d) continue;                 // symbol not in the snapshot yet
    S.data[stk.sym] = d;
    recompute(stk.sym);
    have++;
  }
  S.snapshotMeta = {
    lastBarDate: snap.lastBarDate,
    generatedAt: snap.generatedAt,
    staleDays:   stalenessDays(snap),
  };
  S.macro = snap;
  emit('stocks:updated', { phase: 'snapshot', ok: have });

  // ---- Phase 2: live quote overlay (best effort) ---------------------------
  try {
    const quotes = await fetchPricesTradingView(STOCKS);
    let live = 0;
    for (const stk of STOCKS) {
      if (applyLiveQuote(stk.sym, quotes[stk.sym])) { recompute(stk.sym); live++; }
    }
    emit('stocks:updated', { phase: 'live', ok: live });
  } catch (e) {
    console.warn('[AlphaSeeker] live quotes unavailable, showing last close:', e.message);
    emit('stocks:updated', { phase: 'live', ok: 0, error: e });
  }
}

export function refreshAll() {
  S.data = {};
  S.signals = {};
  emit('grid:rerender');
  loadAll();
}
