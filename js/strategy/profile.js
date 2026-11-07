/* Alpha-Seeker — profile.js
   Moved verbatim from Alpha-Seeker.html lines 1284-1309, 1310-1312, 1313-1325.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { cleanNums } from '../core/num.js';
import { emaSeries, smaSeries } from '../stats/ma.js';
import { calcRSIseries } from '../stats/rsi.js';
import { HS_HORIZON, HS_MIN_N, HS_MIN_WIN } from './params.js';
import { HS_SETUPS } from './setups.js';

export function profileStock(closes){
  try{
    var c=(closes||[]).map(function(v){return v==null?null:+v;});
    if(cleanNums(c).length<120) return null;
    var x={ c:c, rsi:calcRSIseries(c,14), e21:emaSeries(c,21), e50:emaSeries(c,50), e200:emaSeries(c,200), m200:smaSeries(c,200) };
    var H=HS_HORIZON, last=c.length-1, out=[];
    HS_SETUPS.forEach(function(s){
      var rets=[], firedNow=false, recent=null;
      for(var i=1;i<=last;i++){
        if(c[i]==null) continue;
        var fire=false; try{ fire=s.test(i,x); }catch(e){ fire=false; }
        if(!fire) continue;
        if(i===last) firedNow=true;
        if(i>last-4) recent=(recent==null)?(last-i):Math.min(recent,last-i);
        if(i+H<=last && c[i+H]!=null) rets.push((c[i+H]-c[i])/c[i]*100);
      }
      var n=rets.length,
          win=n?rets.filter(function(r){return r>0;}).length/n*100:0,
          avg=n?rets.reduce(function(a,b){return a+b;},0)/n:0;
      out.push({ key:s.key, name:s.name, short:s.short, n:n, win:win, avg:avg, firedNow:firedNow, recent:recent });
    });
    var q=out.filter(function(r){ return r.n>=HS_MIN_N&&r.win>=HS_MIN_WIN&&r.avg>0; });
    q.sort(function(a,b){ return (b.avg*b.win)-(a.avg*a.win); });
    return { best:q[0]||null, ranked:q, all:out, horizon:H };
  }catch(e){ return null; }
}

export function hsEdgeText(b,H){
  return 'it '+b.name+' — historically +'+b.avg.toFixed(1)+'% avg over '+H+'d, '+Math.round(b.win)+'% win rate across '+b.n+' past occurrences';
}

export function hsPrecision(prof, sym){
  if(!prof||!prof.best) return null;
  var b=prof.best, H=prof.horizon, tk=sym||'This stock';
  if(b.firedNow){
    return { label:'PRECISION LONG ⚡', strength:5, edge:b,
      detail:'Backtested edge triggering NOW. Today\'s bar matches '+tk+'\'s best setup: '+hsEdgeText(b,H)+'. This is its highest-expectancy Precision entry.' };
  }
  if(b.recent!=null&&b.recent<=3){
    return { label:'PRECISION LONG ⚡', strength:4, edge:b,
      detail:'Backtested edge fired '+b.recent+' bar'+(b.recent===1?'':'s')+' ago and is still in the window. '+tk+': '+hsEdgeText(b,H)+'.' };
  }
  return null;
}
