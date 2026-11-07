/* Alpha-Seeker — vol.js
   Moved verbatim from Alpha-Seeker.html lines 1074-1074, 1075-1075, 1076-1076, 1077-1077, 1078-1078, 1079-1084.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { cleanNums, logReturns, stdev } from '../core/num.js';

export function realizedVol(rets,n){ return stdev(rets.slice(-n))*Math.sqrt(252)*100; }

export function ewmaVol(rets,lam){ lam=lam||0.94; if(!rets.length) return 0; var v=rets[0]*rets[0]; for(var i=1;i<rets.length;i++){ v=lam*v+(1-lam)*rets[i]*rets[i]; } return Math.sqrt(v*252)*100; }

export function skewness(a){ var n=a.length; if(n<3) return 0; var m=a.reduce(function(x,y){return x+y;},0)/n, s=stdev(a); if(s===0) return 0; var sum=a.reduce(function(acc,x){return acc+Math.pow((x-m)/s,3);},0); return (n/((n-1)*(n-2)))*sum; }

export function kurtosis(a){ var n=a.length; if(n<4) return 0; var m=a.reduce(function(x,y){return x+y;},0)/n, s=stdev(a); if(s===0) return 0; var sum=a.reduce(function(acc,x){return acc+Math.pow((x-m)/s,4);},0); return (n*(n+1)/((n-1)*(n-2)*(n-3)))*sum - 3*(n-1)*(n-1)/((n-2)*(n-3)); }

export function volPercentile(closes){ var rets=logReturns(closes); if(rets.length<60) return null; var w=20, series=[]; for(var i=w;i<=rets.length;i++){ series.push(stdev(rets.slice(i-w,i))); } if(series.length<10) return null; var cur=series[series.length-1]; var below=series.filter(function(v){return v<=cur;}).length; return Math.round(below/series.length*100); }

export function computeVol(d){
  var closes=cleanNums(d.closes||[]);
  if(closes.length<30) return null;
  var rets=logReturns(closes), rr=rets.slice(-60);
  return { rv20:realizedVol(rets,20), rv5:realizedVol(rets,5), ewma:ewmaVol(rets,0.94), pctile:volPercentile(closes), skew:skewness(rr), kurt:kurtosis(rr) };
}
