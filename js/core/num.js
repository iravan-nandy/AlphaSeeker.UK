/* Alpha-Seeker — num.js
   Moved verbatim from Alpha-Seeker.html lines 1000-1000, 1072-1072, 1073-1073, 1096-1101.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function cleanNums(a){ return (a||[]).filter(function(v){return v!=null && !isNaN(v);}); }

export function logReturns(c){ var r=[]; for(var i=1;i<c.length;i++){ if(c[i]>0&&c[i-1]>0) r.push(Math.log(c[i]/c[i-1])); } return r; }

export function stdev(a){ if(a.length<2) return 0; var m=a.reduce(function(x,y){return x+y;},0)/a.length; var v=a.reduce(function(s,x){return s+(x-m)*(x-m);},0)/(a.length-1); return Math.sqrt(v); }

export function fitLine(idx, vals){
  var n=idx.length; if(n<2) return null; var sx=0,sy=0,sxx=0,sxy=0;
  for(var i=0;i<n;i++){ sx+=idx[i]; sy+=vals[i]; sxx+=idx[i]*idx[i]; sxy+=idx[i]*vals[i]; }
  var den=n*sxx-sx*sx; if(den===0) return null;
  var slope=(n*sxy-sx*sy)/den; return {slope:slope, intercept:(sy-slope*sx)/n};
}
