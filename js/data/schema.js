/* Alpha-Seeker — schema.js
   The canonical bar-series shape, and the version seam between the published
   data artifact and this client. Every provider must return this shape, so
   nothing downstream (stats, strategy, UI) ever learns where data came from. */

export const SNAPSHOT_SCHEMA = 1;

/** Shape produced by providers and consumed by everything downstream:
 *  { price, prevClose, change, changePct, volume, currency,
 *    closes[], volumes[], highs[]|null, lows[]|null, atr14|null,
 *    earnings|null, live, src }
 *  highs/lows are null when the provider ships a precomputed atr14 instead --
 *  calcATR is the only consumer, and computeRisk prefers atr14 when present. */

export function validateSnapshot(doc) {
  const problems = [];
  if (!doc || typeof doc !== 'object') return ['snapshot is not an object'];
  if (doc.schema !== SNAPSHOT_SCHEMA)
    problems.push(`schema ${doc.schema} != expected ${SNAPSHOT_SCHEMA} — refusing to render stale/ahead data`);
  if (!Array.isArray(doc.calendar) || !doc.calendar.length) problems.push('calendar missing or empty');
  if (!doc.symbols || typeof doc.symbols !== 'object') problems.push('symbols missing');
  return problems;
}

/** Days since the last bar, or null if unknown. The UI warns past 4. */
export function stalenessDays(doc, nowMs = Date.now()) {
  if (!doc || !doc.lastBarDate) return null;
  const t = Date.parse(doc.lastBarDate + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return Math.floor((nowMs - t) / 86400000);
}
