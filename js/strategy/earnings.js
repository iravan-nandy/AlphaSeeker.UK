/* Alpha-Seeker — earnings.js
   Moved verbatim from Alpha-Seeker.html lines 1378-1383, 1415-1430.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { S } from '../state/store.js';
import { EARN_WINDOW } from './params.js';

export function earningsDays(dateStr){
  if(!dateStr) return null;
  var t=new Date(dateStr+'T00:00:00').getTime();
  if(isNaN(t)) return null;
  return Math.round((t-Date.now())/864e5);
}

export function applyEarningsGate(sym){
  var d=S.data[sym], sig=S.signals[sym];
  if(!d||!sig||!d.earnings) return;
  var days=earningsDays(d.earnings.date);
  d.earnDays=days;
  if(days==null||days<0||days>EARN_WINDOW) return;
  ['precision','momentum'].forEach(function(k){
    var s=sig[k]; if(!s||s._earnGated) return;
    if(s.strength>=4){
      s._origLabel=s.label; s._origStrength=s.strength; s._earnGated=true;
      s.label='EARNINGS RISK ⚠';
      s.detail='⚠ Reports earnings in '+days+' day'+(days===1?'':'s')+' ('+d.earnings.date+'). Long setup on hold — a binary event sits between you and your stop. Reassess after the print. (Prior read: '+s._origLabel+'.)';
      s.strength=1;
    }
  });
}
