/* Alpha-Seeker — macro.js
   Moved verbatim from Alpha-Seeker.html lines 1169-1169, 1170-1203, 1204-1233.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { S } from '../state/store.js';
import { calcEMA } from '../stats/ma.js';
import { fmtPrice, fmtPct } from '../core/format.js';
import { seriesFor } from '../data/providers/snapshot.js';

export function trendOf(d){ if(!d||!d.closes||!d.closes.length) return null; var e=calcEMA(d.closes,21); if(!e) return null; return (d.price-e)/e*100; }

/* The market-regime bar.

   Previously this made its own TradingView scan plus a quickFetchPrice() call
   for BTC. The scan returns no history, so every tile carried `closes:[]`,
   trendOf() always returned null, and the regime read was permanently
   "Neutral / Mixed" -- which is why a dirOf() fallback to the daily % change
   had been bolted on. quickFetchPrice's four paths are all dead proxies or
   CORS-blocked Yahoo URLs, so BTC never resolved either.

   The snapshot now carries real closes for all seven series, so trendOf() does
   what it was written to do and the fallback is gone. */
const MACRO_TILES = [
  ['spy', 'SPY'], ['qqq', 'QQQ'], ['iwm', 'IWM'],
  ['usd', 'UUP'], ['gold', 'GLD'], ['oil', 'USO'], ['btc', 'BTC-USD'],
];

export function loadMacro(snapshot) {
  const out = { spy:null, qqq:null, iwm:null, usd:null, gold:null, oil:null, btc:null };
  if (snapshot) {
    for (const [key, sym] of MACRO_TILES) {
      const d = seriesFor(snapshot, sym);
      if (d) out[key] = d;
    }
  }
  renderMacro(out);
}

export function renderMacro(o){
  var badge=document.getElementById('mrBadge'), tiles=document.getElementById('macroTiles'), note=document.getElementById('macroNote');
  if(!badge) return;
  var defs=[['SPY','S&P 500',o.spy],['QQQ','Nasdaq 100',o.qqq],['IWM','Small caps',o.iwm],['UUP','US Dollar',o.usd],['GLD','Gold',o.gold],['USO','Oil (WTI)',o.oil],['BTC','Bitcoin',o.btc]];
  var h='';
  defs.forEach(function(x){ var d=x[2];
    if(!d){ h+='<div class="mtile"><div class="t-k">'+x[1]+'</div><div class="t-p" style="color:var(--t3)">—</div><div class="t-tr">'+x[0]+'</div></div>'; return; }
    var t=trendOf(d), cc=d.changePct>=0?'var(--green)':'var(--red)';
    var pr = x[0]==='BTC' ? '$'+Math.round(d.price).toLocaleString('en-US') : fmtPrice(d.price,d.currency);
    h+='<div class="mtile"><div class="t-k">'+x[1]+' ('+x[0]+')</div><div class="t-p">'+pr+'</div><div class="t-c" style="color:'+cc+'">'+fmtPct(d.changePct)+'</div><div class="t-tr">'+(t!=null?((t>=0?'▲ +':'▼ ')+t.toFixed(1)+'% vs 21EMA'):'')+'</div></div>';
  });
  tiles.innerHTML=h;
  // trendOf() now has real closes from the snapshot, so the old fallback to the
  // daily % change (which existed only because the TV scan returned no history)
  // is gone. Kept as a thin wrapper so the scoring below reads unchanged.
  function dirOf(d){ return trendOf(d); }
  var risk=0; [o.spy,o.qqq,o.iwm].forEach(function(d){ var t=dirOf(d); if(t!=null) risk+= t>0?1:-1; });
  var usdT=dirOf(o.usd), btcT=dirOf(o.btc);
  var score=risk + (usdT!=null?(usdT<0?1:-1):0) + (btcT!=null?(btcT>0?1:0):0);
  var regime,cls;
  if(score>=2){regime='Risk-On';cls='mr-on';} else if(score<=-2){regime='Risk-Off';cls='mr-off';} else {regime='Neutral / Mixed';cls='mr-neutral';}
  badge.textContent=regime; badge.className='mr-badge '+cls;
  var spyT=dirOf(o.spy), iwmT=dirOf(o.iwm), parts=[];
  if(spyT!=null&&iwmT!=null) parts.push((spyT>0&&iwmT>0)?'broad participation (small caps confirming)':(spyT>0&&iwmT<=0)?'narrow — large caps lead, small caps lag':'weak breadth');
  if(usdT!=null) parts.push('USD '+(usdT<0?'softening (supportive)':'firming (headwind)'));
  if(o.gold) parts.push('gold '+(dirOf(o.gold)>0?'bid':'soft'));
  if(o.oil) parts.push('oil '+(dirOf(o.oil)>0?'firm':'soft'));
  if(btcT!=null) parts.push('BTC '+(btcT>0?'risk-on':'risk-off'));
  note.textContent = parts.length? parts.join(' · ')+'.' : 'Live macro data unavailable — check your data source/token.';
}
