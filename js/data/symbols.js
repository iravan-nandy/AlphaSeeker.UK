/* Alpha-Seeker — data/symbols.js
   The tradeable universe. Previously an 84-entry array literal inline in the
   monolith (lines 816-913); now data/universe.json, so the list is editable
   without touching code and the data workflow can read the same file.

   STOCKS is a const whose CONTENTS are replaced, never the binding: exported
   bindings are read-only for importers, and every consumer does
   `import { STOCKS }`. This is also the seam the "Select Portfolio" feature
   plugs into -- it will call setUniverse() with symbols parsed from a
   portfolio-labelled GitHub issue. */

export const STOCKS = [];
export const THEME_ORDER = [];

export function setUniverse(doc) {
  if (!doc || !Array.isArray(doc.symbols)) throw new Error('universe: missing symbols[]');
  STOCKS.length = 0;
  STOCKS.push(...doc.symbols);
  THEME_ORDER.length = 0;
  THEME_ORDER.push(...(doc.themeOrder || [...new Set(doc.symbols.map(s => s.theme))]));
  return STOCKS;
}

export async function loadUniverse(url = 'data/universe.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`universe ${res.status} ${res.statusText}`);
  return setUniverse(await res.json());
}
