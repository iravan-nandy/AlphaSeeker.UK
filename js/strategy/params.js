/* Alpha-Seeker — params.js
   Moved verbatim from Alpha-Seeker.html lines 1243-1243, 1244-1244, 1245-1245, 1376-1376, 1377-1377.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export const HS_HORIZON = 10;   // forward trading days used to score each setup

export const HS_MIN_N   = 6;    // min past occurrences before a setup is trusted

export const HS_MIN_WIN = 55;   // min win-rate (%) to qualify as an edge

export const EARNINGS_OVERRIDE = {};

export const EARN_WINDOW = 7; // calendar days before earnings that put a long setup on hold
