/* Alpha-Seeker — signals.js
   Moved verbatim from Alpha-Seeker.html lines 1432-1505.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { detectReclaim } from '../stats/levels.js';
import { calcAvgVol, calcEMA } from '../stats/ma.js';
import { hsEdgeText, hsPrecision, profileStock } from './profile.js';

export function generateSignals(price, closes, volumes, sym) {
  if (!closes || closes.length < 30 || !price) {
    return { precision:{label:'N/A',detail:'Insufficient data',strength:0}, momentum:{label:'N/A',detail:'Insufficient data',strength:0}, meta:{} };
  }
  var profile = profileStock(closes);      // per-stock backtested edge
  var hsPrec  = hsPrecision(profile, sym); // active high-confidence edge entry (or null)
  var ema21 = calcEMA(closes,21);
  var ema50 = closes.length>=50 ? calcEMA(closes,50) : null;
  var ema200 = closes.length>=200 ? calcEMA(closes,200) : null;
  var avgVol20 = calcAvgVol(volumes,20), avgVol5 = calcAvgVol(volumes,5);
  var volRatio = (avgVol20 && avgVol5) ? avgVol5/avgVol20 : null;
  var pct21 = ema21 ? ((price-ema21)/ema21)*100 : null;
  var pct50 = ema50 ? ((price-ema50)/ema50)*100 : null;
  var pct200 = ema200 ? ((price-ema200)/ema200)*100 : null;
  var recent = closes.slice(-20).filter(function(c){return c!=null;});
  var high20 = Math.max.apply(null,recent), low20 = Math.min.apply(null,recent);
  var isNearHigh = price >= high20*0.97;
  var above200 = ema200 ? price>=ema200 : (ema50? price>=ema50 : true);
  var above50  = ema50 ? price>=ema50 : true;
  var trend = above200 ? (above50?'uptrend':'pullback') : (above50?'recovering':'downtrend');
  var rec = detectReclaim(closes, ema50, ema200);

  // ── PRECISION DESK ──
  // A backtested, currently-triggering edge for THIS stock beats the generic
  // rulebook — this is the "tuned to each individual chart" behaviour.
  var prec;
  if (hsPrec) {
    prec = hsPrec;
  } else if (rec && rec.bull) {
    prec = { label:'RECLAIM ⚡', detail:rec.text+' A failed breakdown that reclaims support is a high-probability long — stop just back below '+rec.level.toFixed(2)+'.', strength:5 };
  } else if (ema21 && price<ema21 && volRatio && volRatio>1.25 && !above200) {
    prec = { label:'SELL ALERT 🚨', detail:'Below the 21 EMA on volume '+Math.round((volRatio||1)*100)+'% of avg AND under the 200 MA — momentum and long-term trend both negative.', strength:-1 };
  } else if (pct21!==null && pct21>=-3 && pct21<=2 && volRatio && volRatio<0.75) {
    prec = { label:'PRECISION LONG ⚡', detail:'Price '+Math.abs(pct21).toFixed(1)+'% from 21 EMA, volume '+Math.round(volRatio*100)+'% of avg — textbook dry-up.'+(above200?'':' ⚠ Below the 200 MA, so this is counter-trend — size down.'), strength:above200?5:3 };
  } else if (pct21!==null && pct21>=-3 && pct21<=2 && volRatio && volRatio<0.90) {
    prec = { label:'PRECISION LONG ⚡', detail:'Price '+Math.abs(pct21).toFixed(1)+'% from 21 EMA, volume drying ('+Math.round(volRatio*100)+'% of avg).'+(above200?'':' ⚠ Below 200 MA — counter-trend, smaller size.'), strength:above200?4:3 };
  } else if (pct21!==null && pct21>-8 && pct21<-3) {
    prec = { label:'APPROACHING 👀', detail:Math.abs(pct21).toFixed(1)+'% under the 21 EMA. Let it settle on declining volume before entering.', strength:3 };
  } else if (pct21!==null && pct21>2 && pct21<10) {
    prec = { label:'EXTENDED ⏸', detail:pct21.toFixed(1)+'% above the 21 EMA. Do not chase — wait for a pullback.', strength:1 };
  } else if (pct21!==null && pct21>=10) {
    prec = { label:'TOO EXTENDED 🚫', detail:pct21.toFixed(1)+'% above the 21 EMA. Poor risk/reward here.', strength:0 };
  } else if (!above200) {
    prec = { label:'CAUTION ⚠', detail:(pct200!==null?Math.abs(pct200).toFixed(1)+'% below the 200 MA. ':'')+'Long-term trend is down — not an automatic no, but only act on a clean reclaim or a tight pullback setup, and size down.', strength:1 };
  } else {
    prec = { label:'WATCH 🔍', detail:'In an uptrend but no actionable Precision entry right now. Patience.', strength:2 };
  }
  // Even when the generic label wins, surface this chart's statistical edge so the
  // user knows what setup to wait for on this specific name.
  if (profile && profile.best && !prec.edge) {
    prec.edge = profile.best;
    prec.detail += ' 📊 ' + (sym||'This stock') + '\'s statistical edge: ' + hsEdgeText(profile.best, profile.horizon) + ' — wait for that setup.';
  }

  // ── MOMENTUM DESK ──
  var mom;
  if (rec && rec.bull && isNearHigh) {
    mom = { label:'RECLAIM + HIGHS 🔥', detail:rec.text+' Reclaiming support while pressing 20-day highs — the strongest momentum combo.', strength:5 };
  } else if (isNearHigh && volRatio && volRatio>1.4) {
    mom = { label:'MOMENTUM LONG 🔥', detail:'Testing 20-day highs on volume '+Math.round(volRatio*100)+'% of avg — accumulation. Open first DCA tranche.'+(above200?'':' ⚠ Below 200 MA — counter-trend trade.'), strength:above200?5:4 };
  } else if (isNearHigh && (!volRatio || volRatio>1.0)) {
    mom = { label:'BUILD POSITION 📈', detail:'Near 20-day highs, thesis intact. Consider a DCA tranche; wait for volume to confirm.', strength:4 };
  } else if (volRatio && volRatio>1.5 && ema21 && price>ema21) {
    mom = { label:'VOLUME SURGE ⚡', detail:'Volume '+Math.round(volRatio*100)+'% of average above the 21 EMA — unusual activity. Monitor.', strength:3 };
  } else if (ema21 && price<ema21 && above200) {
    mom = { label:'WAIT 🕐', detail:'Pulling back below the 21 EMA but holding above the 200 MA. Hold; add only when momentum returns.', strength:1 };
  } else if (!above200) {
    mom = { label:'CAUTION ⚠', detail:'Below the 200 MA — wait for a reclaim before building a position.', strength:1 };
  } else {
    mom = { label:'HOLD / WATCH', detail:'Above key averages, no momentum trigger yet. Hold and wait for volume near highs.', strength:2 };
  }

  return { precision:prec, momentum:mom, meta:{ ema21:ema21, ema50:ema50, ema200:ema200, pct21:pct21, pct50:pct50, pct200:pct200, volRatio:volRatio, high20:high20, low20:low20, trend:trend, reclaim:rec, profile:profile } };
}
