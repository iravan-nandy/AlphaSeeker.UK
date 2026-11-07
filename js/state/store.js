/* Alpha-Seeker — store.js
   Moved verbatim from Alpha-Seeker.html lines 918-930.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export const S = {
  activeTheme: 'all',
  activeDesk:  'both',
  isPremium:   false,
  isAdmin:     false,
  data:        {},   // sym → { price, changePct, closes, volumes, … }
  signals:     {},   // sym → { precision, momentum, meta }
  adminContent:{},   // sym → { precision:{}, momentum:{} }
  loading:     new Set(),
  logoClicks:  0,
  logoTimer:   null,
  currentSym:  null,
};
