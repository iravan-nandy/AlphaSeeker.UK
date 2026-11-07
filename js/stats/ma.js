/* Alpha-Seeker — ma.js
   Moved verbatim from Alpha-Seeker.html lines 935-943, 945-949, 1246-1253, 1254-1259.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function calcEMA(arr, n) {
  if (!arr || arr.length < n) return null;
  const k = 2 / (n + 1);
  let ema = arr.slice(0, n).reduce((a, b) => a + (b||0), 0) / n;
  for (let i = n; i < arr.length; i++) {
    if (arr[i] != null) ema = arr[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calcAvgVol(arr, n) {
  if (!arr || arr.length < n) return null;
  const slice = arr.slice(-n).filter(v => v != null);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function emaSeries(c,n){
  if(!c||c.length<n) return [];
  var k=2/(n+1), out=new Array(c.length).fill(null), seed=0;
  for(var i=0;i<n;i++) seed+=(c[i]||0);
  var ema=seed/n; out[n-1]=ema;
  for(var i=n;i<c.length;i++){ var v=c[i]; if(v==null){ out[i]=ema; continue; } ema=v*k+ema*(1-k); out[i]=ema; }
  return out;
}

export function smaSeries(c,n){
  if(!c||c.length<n) return [];
  var out=new Array(c.length).fill(null), sum=0;
  for(var i=0;i<c.length;i++){ sum+=(c[i]||0); if(i>=n) sum-=(c[i-n]||0); if(i>=n-1) out[i]=sum/n; }
  return out;
}
