/* Alpha-Seeker — index.js
   Moved verbatim from Alpha-Seeker.html lines 1110-1114.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { detectDivergence, findLevels, trendlines } from './levels.js';
import { calcRSIseries } from './rsi.js';
import { computeVol } from './vol.js';

export function computeTA(d){
  var closes=d.closes||[];
  var rsiS=calcRSIseries(closes,14);
  return { rsi: rsiS.length? rsiS[rsiS.length-1] : null, divergence: detectDivergence(closes, rsiS), levels: findLevels(d), vol: computeVol(d), trendlines: trendlines(d) };
}
