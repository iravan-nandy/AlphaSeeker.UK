/* Alpha-Seeker — rsi.js
   Moved verbatim from Alpha-Seeker.html lines 1002-1017.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function calcRSIseries(c, period){
  period = period || 14;
  if(!c || c.length < period+1) return [];
  var rsi = new Array(c.length).fill(null);
  var gain=0, loss=0;
  for(var i=1;i<=period;i++){ if(c[i]==null||c[i-1]==null) continue; var ch=c[i]-c[i-1]; if(ch>=0) gain+=ch; else loss-=ch; }
  gain/=period; loss/=period;
  rsi[period] = loss===0?100:100-100/(1+gain/loss);
  for(var k=period+1;k<c.length;k++){
    if(c[k]==null||c[k-1]==null){ rsi[k]=rsi[k-1]; continue; }
    var d=c[k]-c[k-1], g=d>0?d:0, l=d<0?-d:0;
    gain=(gain*(period-1)+g)/period; loss=(loss*(period-1)+l)/period;
    rsi[k]= loss===0?100:100-100/(1+gain/loss);
  }
  return rsi;
}
