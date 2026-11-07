/* Alpha-Seeker — atr.js
   Moved verbatim from Alpha-Seeker.html lines 1330-1343.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function calcATR(highs, lows, closes, n){
  n=n||14;
  if(!highs||!lows||!closes||closes.length<n+1) return null;
  var trs=[];
  for(var i=1;i<closes.length;i++){
    var h=highs[i], l=lows[i], pc=closes[i-1];
    if(h==null||l==null||pc==null) continue;
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  if(trs.length<n) return null;
  var atr=trs.slice(0,n).reduce(function(a,b){return a+b;},0)/n;
  for(var k=n;k<trs.length;k++){ atr=(atr*(n-1)+trs[k])/n; }
  return atr;
}
