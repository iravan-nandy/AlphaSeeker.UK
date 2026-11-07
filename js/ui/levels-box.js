/* Alpha-Seeker — levels-box.js
   Moved verbatim from Alpha-Seeker.html lines 1116-1166.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { fmtPrice } from '../core/format.js';
import { S } from '../state/store.js';
import { trendlines } from '../stats/levels.js';
import { earningsDays } from '../strategy/earnings.js';
import { EARN_WINDOW, HS_HORIZON, HS_MIN_N, HS_MIN_WIN } from '../strategy/params.js';

export function renderLevelsBox(sym){
  var box=document.getElementById('modalLevelsBox'); if(!box) return;
  var sg=S.signals[sym]||{}, ta=sg.ta, d=S.data[sym];
  var prof=(sg.meta&&sg.meta.profile)||null, edgeHTML='';
  if(prof && prof.ranked && prof.ranked.length){
    edgeHTML='<div class="lvl-row" style="border-top:1px dashed var(--border);margin-top:8px;padding-top:10px"><span class="lvl-k">Edge '+HS_HORIZON+'d</span><span class="lvl-v">'+
      prof.ranked.slice(0,3).map(function(r){ return '<b style="color:var(--prec)">'+r.short+'</b> +'+r.avg.toFixed(1)+'% avg &middot; '+Math.round(r.win)+'% win &middot; '+r.n+'×'; }).join('<br>')+
      '<br><span class="lvl-t">Backtested on this chart\'s own history (in-sample, no costs).</span></span></div>';
  } else if(prof){
    edgeHTML='<div class="lvl-row" style="border-top:1px dashed var(--border);margin-top:8px;padding-top:10px"><span class="lvl-k">Edge '+HS_HORIZON+'d</span><span class="lvl-v" style="color:var(--t3)">No setup has cleared '+HS_MIN_WIN+'% win over '+HS_MIN_N+'+ occurrences on this name yet.</span></div>';
  }
  if(!ta||!d){ box.innerHTML=''; return; }
  var cur=d.currency;
  var risk=sg.risk, planHTML='';
  if(risk && risk.stop!=null){
    var rrCol = risk.rr>=2?'var(--green)':risk.rr>=1?'var(--amber)':'var(--red)';
    planHTML='<div class="lvl-row" style="border-top:1px dashed var(--border);margin-top:8px;padding-top:10px"><span class="lvl-k">Trade plan</span><span class="lvl-v">'+
      'Entry <b>'+fmtPrice(risk.entry,cur)+'</b> &middot; Stop <b style="color:var(--red)">'+fmtPrice(risk.stop,cur)+'</b> (&minus;'+risk.stopPct.toFixed(1)+'%, '+risk.stopBasis+')<br>'+
      'Target <b style="color:var(--green)">'+fmtPrice(risk.target,cur)+'</b> (+'+risk.targetPct.toFixed(1)+'%, '+risk.targetBasis+') &middot; R:R <b style="color:'+rrCol+'">'+(risk.rr!=null?risk.rr.toFixed(1):'—')+'</b>'+(risk.atr?' &middot; ATR '+fmtPrice(risk.atr,cur):'')+
      '<br><span class="lvl-t">Size the position so a full stop-out ≈ 1% of your account. Educational, not advice.</span></span></div>';
  }
  var earn=d.earnings, edys=earn?earningsDays(earn.date):null, earnHTML='';
  if(earn){
    var risky=(edys!=null&&edys>=0&&edys<=EARN_WINDOW);
    earnHTML='<div class="lvl-row"><span class="lvl-k">Earnings</span><span class="lvl-v">'+earn.date+
      (edys!=null?(' &middot; '+(edys<0?'reported':edys+' day'+(edys===1?'':'s')+' away')):'')+
      (risky?' <span class="lvl-flip" style="color:var(--amber);background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3)">event risk</span>':'')+
      '</span></div>';
  }
  function rowHTML(label,arr,color){
    if(!arr||!arr.length) return '<div class="lvl-row"><span class="lvl-k">'+label+'</span><span class="lvl-v" style="color:var(--t3)">none in range</span></div>';
    var v=arr.map(function(x){ return '<b style="color:'+color+'">'+fmtPrice(x.px,cur)+'</b>'+(x.flipped?' <span class="lvl-flip">flipped R→S</span>':'')+(x.touches>1?' <span class="lvl-t">'+x.touches+'×</span>':''); }).join(' · ');
    return '<div class="lvl-row"><span class="lvl-k">'+label+'</span><span class="lvl-v">'+v+'</span></div>';
  }
  var rsi=ta.rsi, zone=rsi==null?'':(rsi>=70?'overbought':rsi<=30?'oversold':rsi>=50?'bullish':'bearish');
  var rc=rsi==null?'var(--t2)':(rsi>=70?'var(--red)':rsi<=30?'var(--green)':'var(--prec)');
  var dv=ta.divergence? '<div class="lvl-div '+ta.divergence.type+'">'+(ta.divergence.type==='bullish'?'🟢 Bullish divergence — ':'🔴 Bearish divergence — ')+ta.divergence.text+'</div>' : '<div class="lvl-div none">No active RSI divergence on the daily timeframe.</div>';
var vol=ta.vol;
  var volHTML = vol ? ('<div class="lvl-row"><span class="lvl-k">Volatility</span><span class="lvl-v">RV20 <b>'+vol.rv20.toFixed(0)+'%</b>'+(vol.pctile!=null?' · <b style="color:'+(vol.pctile>=80?'var(--red)':vol.pctile<=20?'var(--green)':'var(--amber)')+'">'+vol.pctile+'th pctile</b>':'')+' · EWMA fcast <b>'+vol.ewma.toFixed(0)+'%</b></span></div>'+
    '<div class="lvl-row"><span class="lvl-k">Return shape</span><span class="lvl-v">skew <b style="color:'+(vol.skew<0?'var(--red)':'var(--green)')+'">'+vol.skew.toFixed(2)+'</b> · excess kurt <b>'+vol.kurt.toFixed(2)+'</b>'+(vol.kurt>3?' <span class="lvl-t">fat tails</span>':'')+'</span></div>') : '';
var meta=sg.meta||{}, tl=ta.trendlines, trendRows='';
  if(meta.ema200!=null){ trendRows += '<div class="lvl-row"><span class="lvl-k">Long-term</span><span class="lvl-v">'+(meta.pct200>=0?'<b style="color:var(--green)">above</b>':'<b style="color:var(--red)">below</b>')+' 200 MA ('+(meta.pct200>=0?'+':'')+meta.pct200.toFixed(1)+'%) &middot; '+(meta.trend||'')+'</span></div>'; }
  else if(meta.ema50!=null){ trendRows += '<div class="lvl-row"><span class="lvl-k">Trend</span><span class="lvl-v">'+(meta.pct50>=0?'+':'')+meta.pct50.toFixed(1)+'% vs 50 MA &middot; '+(meta.trend||'')+'</span></div>'; }
  if(tl){ var tp=[]; if(tl.support) tp.push(tl.support.slope+' support ~<b style="color:var(--green)">'+fmtPrice(tl.support.value,cur)+'</b>'); if(tl.resistance) tp.push(tl.resistance.slope+' resistance ~<b style="color:var(--red)">'+fmtPrice(tl.resistance.value,cur)+'</b>'); if(tp.length) trendRows += '<div class="lvl-row"><span class="lvl-k">Trendlines</span><span class="lvl-v">'+tp.join('<br>')+'</span></div>'; }
  var trendHTML = trendRows + ((meta.reclaim&&meta.reclaim.bull)?'<div class="lvl-div bullish">🟢 '+meta.reclaim.text+' Watch for continuation above the reclaimed level.</div>':'');
  box.innerHTML='<div class="sig-analysis-header"><h4>🔥 Alphaseeker — Key Levels &amp; Momentum</h4>'+
    (rsi!=null?'<span class="big-signal" style="background:var(--bg2);color:'+rc+';border:1px solid var(--border)">RSI '+rsi.toFixed(0)+' · '+zone+'</span>':'')+'</div>'+
    trendHTML+
    (ta.levels? rowHTML('Resistance',ta.levels.resistance,'var(--red)')+rowHTML('Support',ta.levels.support,'var(--green)') : '<div class="sig-detail">Not enough history for level detection.</div>')+
    planHTML+earnHTML+volHTML+dv+edgeHTML;
}
