/* Alpha-Seeker — providers/tradingview.js
   Live quote overlay. Derived from Alpha-Seeker.html lines 1634-1694.

   The TradingView scanner is the one third-party endpoint in the original that
   still works from a browser: verified 2026-09-29, it answers with
   Access-Control-Allow-Origin reflecting the caller's Origin, needs no API key,
   and returns every ticker in a single POST.

   Changes from the original:
     * Dropped the corsproxy.io strategy -- keyless access now returns
       403 "Anonymous legacy proxy URLs are no longer supported".
     * Dropped the allorigins envelope unwrap, that proxy being down (522).
     * Added currency and earnings_release_next_date to the column list, which
       retires fetchEarnings() entirely. That function raced four endpoints that
       are all dead, so it returned null for every symbol and the earnings gate
       silently never fired.
     * Removed quickFetchPrice(): all six of its attempts were dead proxies or
       CORS-blocked Yahoo URLs. History comes from the snapshot now.

   This is best-effort. If it fails the page still shows the last close from the
   snapshot -- the inverse of the old behaviour, where a TradingView failure
   meant no prices at all. */

const TV_URL = 'https://scanner.tradingview.com/america/scan';
const TIMEOUT_MS = 12000;

// Order here must match the destructuring in parseTVResponse.
const COLUMNS = ['close', 'change', 'change_abs', 'volume',
                 'average_volume_10d_calc', 'SMA50', 'SMA200', 'beta_1_year',
                 'currency', 'earnings_release_next_date'];

function parseTVResponse(json) {
  const out = {};
  (json.data || []).forEach(item => {
    if (!item || !item.d) return;
    const sym = item.s.split(':')[1];
    const [price, changePct, changeAbs, volume, avgVol, ma50, ma200, beta,
           currency, earnTs] = item.d;
    if (price == null) return;
    out[sym] = {
      price, changePct: changePct || 0, change: changeAbs || 0,
      prevClose: price - (changeAbs || 0), volume: volume || 0,
      avgVolume: avgVol || null, ma50: ma50 || null,
      ma200: ma200 || null, beta: beta || null,
      currency: currency || 'USD',
      // seconds since epoch -> YYYY-MM-DD, matching the snapshot's field
      // { date } object shape is what applyEarningsGate() reads.
      earnings: earnTs ? { date: new Date(earnTs * 1000).toISOString().slice(0, 10) } : null,
    };
  });
  if (!Object.keys(out).length) throw new Error('empty TV result');
  return out;
}

async function attempt(fetchFn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetchFn(ctrl.signal);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return parseTVResponse(await r.json());
  } finally {
    clearTimeout(t);
  }
}

export async function fetchPricesTradingView(stocks) {
  const bodyStr = JSON.stringify({
    symbols: { tickers: stocks.map(s => `${s.ex || 'NASDAQ'}:${s.sym}`), query: { types: [] } },
    columns: COLUMNS,
  });
  return Promise.any([
    // Normal path.
    attempt(sig => fetch(TV_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: bodyStr, signal: sig,
    })),
    // No Content-Type => text/plain => a "simple request", so no CORS preflight.
    // Kept because it survives environments that block the OPTIONS probe.
    attempt(sig => fetch(TV_URL, { method: 'POST', body: bodyStr, signal: sig })),
  ]);
}
