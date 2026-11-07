/* Alpha-Seeker — providers/snapshot.js
   Reads data/snapshot.json, which a scheduled GitHub Action builds server-side
   (scripts/fetch_prices.py). One same-origin GET replaces what the monolith did
   with up to 13 racing requests per ticker across four CORS proxies -- every one
   of which is now dead or blocked.

   The API key never reaches the browser; it lives in a GitHub Secret. */

import { validateSnapshot, stalenessDays } from '../schema.js';

let cache = null;

export async function loadSnapshot(url = 'data/snapshot.json') {
  if (cache) return cache;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`snapshot ${res.status} ${res.statusText}`);
  const doc = await res.json();
  const problems = validateSnapshot(doc);
  if (problems.length) throw new Error('invalid snapshot: ' + problems.join('; '));
  cache = doc;
  return doc;
}

/** Build the canonical series for one symbol, or null if absent. */
export function seriesFor(doc, sym) {
  const e = doc.symbols && doc.symbols[sym];
  if (!e || !Array.isArray(e.c)) return null;
  const closes = e.c, volumes = e.v || [];
  // Last non-null close is "price" until a live quote overwrites it.
  let i = closes.length - 1;
  while (i >= 0 && closes[i] == null) i--;
  if (i < 0) return null;
  const price = closes[i];
  let j = i - 1;
  while (j >= 0 && closes[j] == null) j--;
  const prev = j >= 0 ? closes[j] : null;
  return {
    price,
    prevClose: prev,
    change:    prev != null ? price - prev : 0,
    changePct: prev ? ((price - prev) / prev * 100) : 0,
    volume:    volumes[i] || 0,
    currency:  'USD',
    closes, volumes,
    // highs/lows are not shipped; atr14 is precomputed by the Action using a
    // direct port of calcATR, so computeRisk gets the identical number.
    highs: null, lows: null,
    atr14: e.atr14 != null ? e.atr14 : null,
    // Shape matches what applyEarningsGate() reads: { date: 'YYYY-MM-DD' }.
    earnings: e.earnings ? { date: e.earnings } : null,
    live: false,
    src: 'snapshot',
  };
}

export { stalenessDays };
