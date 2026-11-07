/* Alpha-Seeker — emitter.js
   Tiny pub/sub so the data pipeline can notify the UI without importing it.
   This is what keeps js/app/load.js free of any js/ui/** import, which in turn
   keeps the grid <-> modal cycle out of the module graph. */

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); }
    catch (e) { console.error(`[AlphaSeeker] listener for "${event}" threw:`, e); }
  }
}
