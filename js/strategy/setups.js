/* Alpha-Seeker — setups.js
   Moved verbatim from Alpha-Seeker.html lines 1260-1283.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export var HS_SETUPS = [
  { key:'rsi30', name:'dips under RSI 30', short:'RSI<30 dip',
    test:function(i,x){ return x.rsi[i]!=null&&x.rsi[i-1]!=null&&x.rsi[i]<30&&x.rsi[i-1]>=30; } },
  { key:'rsi25', name:'gets deeply oversold (RSI<25)', short:'RSI<25 dip',
    test:function(i,x){ return x.rsi[i]!=null&&x.rsi[i-1]!=null&&x.rsi[i]<25&&x.rsi[i-1]>=25; } },
  { key:'ema21', name:'pulls back to the 21 EMA in an uptrend', short:'21 EMA ride',
    test:function(i,x){ var e=x.e21[i],e5=x.e50[i],c=x.c[i],cp=x.c[i-1],ep=x.e21[i-1];
      if(e==null||e5==null||c==null) return false;
      return c>=e*0.985&&c<=e*1.02&&c>e5 && cp!=null&&ep!=null&&cp>ep*1.03; } },
  { key:'ema50', name:'pulls back to the 50 EMA in an uptrend', short:'50 EMA ride',
    test:function(i,x){ var e=x.e50[i],e2=x.e200[i],c=x.c[i],cp=x.c[i-1],ep=x.e50[i-1];
      if(e==null||c==null) return false; var up=e2==null?true:c>e2;
      return c>=e*0.985&&c<=e*1.02&&up && cp!=null&&ep!=null&&cp>ep*1.03; } },
  { key:'ma200', name:'tests the 200-day MA from above', short:'200MA bounce',
    test:function(i,x){ var m=x.m200[i],c=x.c[i],cp=x.c[i-1],mp=x.m200[i-1];
      if(m==null||c==null) return false;
      return c>=m*0.98&&c<=m*1.03&&c>=m && cp!=null&&mp!=null&&cp>mp*1.04; } },
  { key:'break20', name:'breaks out to a new 20-day high from a base', short:'20d breakout',
    test:function(i,x){ if(i<25) return false; var c=x.c[i],cp=x.c[i-1]; if(c==null||cp==null) return false;
      var hh=-Infinity; for(var j=i-20;j<i;j++){ if(x.c[j]!=null&&x.c[j]>hh) hh=x.c[j]; }
      // genuine breakout: yesterday sat >=2% below the 20d high (broke THROUGH resistance),
      // not just a daily grind where every bar is trivially a new high.
      return isFinite(hh)&&cp<hh*0.98&&c>hh; } },
];
