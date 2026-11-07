/* Alpha-Seeker — risk.js
   Moved verbatim from Alpha-Seeker.html lines 1344-1370.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { calcATR } from '../stats/atr.js';

export function computeRisk(d, sig){
  try{
    if(!d||!sig||!d.price) return null;
    var price=d.price, meta=sig.meta||{}, ta=sig.ta||{};
    // Prefer the precomputed ATR from the snapshot. The data workflow computes it
    // with a direct port of calcATR (scripts/fetch_prices.py:calc_atr), and ATR depends
    // only on history and never on the live price, so this is the identical number --
    // it just saves shipping highs/lows for 520 bars x 84 symbols.
    var atr=(d.atr14!=null)?d.atr14:calcATR(d.highs, d.lows, d.closes, 14);
    var edge=sig.precision&&sig.precision.edge;
    var nearSup= ta.levels&&ta.levels.support&&ta.levels.support[0] ? ta.levels.support[0].px : null;
    var nearRes= ta.levels&&ta.levels.resistance&&ta.levels.resistance[0] ? ta.levels.resistance[0].px : null;
    var atrStop= atr? price-1.5*atr : null;
    var stop=null, stopBasis='';
    if(edge&&edge.key==='ma200'&&meta.ema200){ stop=meta.ema200*0.985; stopBasis='below the 200-day MA'; }
    else if(edge&&edge.key==='ema21'&&meta.ema21){ stop=meta.ema21-(atr?0.5*atr:meta.ema21*0.02); stopBasis='below the 21 EMA'; }
    else if(edge&&edge.key==='ema50'&&meta.ema50){ stop=meta.ema50-(atr?0.5*atr:meta.ema50*0.02); stopBasis='below the 50 EMA'; }
    if(stop==null){
      if(nearSup!=null&&atrStop!=null){ stop=Math.max(nearSup*0.99, atrStop); stopBasis=(Math.abs(stop-atrStop)<1e-9?'1.5×ATR':'below nearest support'); }
      else if(nearSup!=null){ stop=nearSup*0.99; stopBasis='below nearest support'; }
      else if(atrStop!=null){ stop=atrStop; stopBasis='1.5×ATR'; }
    }
    if(stop==null||stop>=price) return { atr:atr, entry:price, stop:null };
    var risk=price-stop;
    var target=(nearRes!=null&&nearRes>price+risk*0.5)? nearRes : price+2*risk;
    var targetBasis=(nearRes!=null&&Math.abs(target-nearRes)<1e-9)?'nearest resistance':'2R projection';
    var reward=target-price;
    return { atr:atr, entry:price, stop:stop, stopBasis:stopBasis, stopPct:risk/price*100,
             target:target, targetBasis:targetBasis, targetPct:reward/price*100, rr:risk>0?reward/risk:null };
  }catch(e){ return null; }
}
