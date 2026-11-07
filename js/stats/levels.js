/* Alpha-Seeker — levels.js
   Moved verbatim from Alpha-Seeker.html lines 1030-1046, 1048-1069, 1086-1095, 1102-1108.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { cleanNums, fitLine } from '../core/num.js';
import { pivotIdx } from './pivots.js';

export function detectDivergence(closes, rsi){
  if(!rsi || rsi.length<25) return null;
  var n=closes.length, win=Math.min(55,n), off=n-win;
  var p=pivotIdx(closes.slice(off),3);
  var H=p.H.map(function(i){return i+off;}), L=p.L.map(function(i){return i+off;});
  if(H.length>=2){
    var a=H[H.length-2], b=H[H.length-1];
    if(closes[a]!=null&&closes[b]!=null&&rsi[a]!=null&&rsi[b]!=null && closes[b]>closes[a]*1.005 && rsi[b]<rsi[a]-1.5)
      return {type:'bearish', text:'price made a higher high while RSI made a lower high. Upside momentum is fading — manage risk into strength.'};
  }
  if(L.length>=2){
    var a2=L[L.length-2], b2=L[L.length-1];
    if(closes[a2]!=null&&closes[b2]!=null&&rsi[a2]!=null&&rsi[b2]!=null && closes[b2]<closes[a2]*0.995 && rsi[b2]>rsi[a2]+1.5)
      return {type:'bullish', text:'price made a lower low while RSI made a higher low. Selling pressure is easing — watch for a reversal.'};
  }
  return null;
}

export function findLevels(d){
  var closes=d.closes||[], price=d.price;
  if(cleanNums(closes).length<25 || !price) return null;
  var p=pivotIdx(closes,3), pts=[];
  p.H.forEach(function(i){ if(closes[i]!=null) pts.push({px:closes[i],kind:'r'}); });
  p.L.forEach(function(i){ if(closes[i]!=null) pts.push({px:closes[i],kind:'s'}); });
  pts.sort(function(a,b){return a.px-b.px;});
  var cl=[];
  pts.forEach(function(pt){
    var c=null;
    for(var x=0;x<cl.length;x++){ if(Math.abs(cl[x].mid-pt.px)/cl[x].mid<0.02){ c=cl[x]; break; } }
    if(c){ c.vals.push(pt.px); c.r+=pt.kind==='r'?1:0; c.s+=pt.kind==='s'?1:0; c.mid=c.vals.reduce(function(a,b){return a+b;},0)/c.vals.length; }
    else cl.push({mid:pt.px, vals:[pt.px], r:pt.kind==='r'?1:0, s:pt.kind==='s'?1:0});
  });
  cl.forEach(function(c){ c.touches=c.vals.length; });
  var sup=cl.filter(function(c){return c.mid<price*0.992;}).sort(function(a,b){return b.mid-a.mid;});
  var res=cl.filter(function(c){return c.mid>price*1.008;}).sort(function(a,b){return a.mid-b.mid;});
  function pack(c){ return {px:c.mid, touches:c.touches, flipped:(c.r>0&&c.s>0)}; }
  var S2=sup.slice(0,2).map(pack), R2=res.slice(0,2).map(pack);
  if(S2[0]) S2[0].flipped = (sup[0].r>=1); // nearest support was also a prior resistance => flipped
  return {support:S2, resistance:R2};
}

export function detectReclaim(closes, ma50, ma200){
  var n=closes.length; if(n<10) return null; var price=closes[n-1];
  function rc(level,name){
    if(!level) return null; var broke=-1;
    for(var k=n-2;k>=Math.max(0,n-11);k--){ if(closes[k]!=null && closes[k]<level){ broke=k; break; } }
    if(broke>=0 && price>level*1.001) return {bull:true, level:level, text:'Failed breakdown: price dipped below the '+name+' and reclaimed it.'};
    return null;
  }
  return rc(ma50,'50-day MA') || rc(ma200,'200-day MA');
}

export function trendlines(d){
  var closes=d.closes||[], n=closes.length; if(n<60) return null;
  var win=Math.min(180,n), off=n-win, seg=closes.slice(off), p=pivotIdx(seg,3), out={};
  if(p.L.length>=2){ var f=fitLine(p.L, p.L.map(function(i){return seg[i];})); if(f) out.support={value:f.intercept+f.slope*(win-1), slope:f.slope>=0?'rising':'falling', touches:p.L.length}; }
  if(p.H.length>=2){ var g=fitLine(p.H, p.H.map(function(i){return seg[i];})); if(g) out.resistance={value:g.intercept+g.slope*(win-1), slope:g.slope>=0?'rising':'falling', touches:p.H.length}; }
  return (out.support||out.resistance)?out:null;
}
