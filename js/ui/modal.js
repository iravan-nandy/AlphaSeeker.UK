/* Alpha-Seeker — modal.js
   Moved verbatim from Alpha-Seeker.html lines 2044-2095, 2097-2202, 2204-2230, 2335-2337, 2339-2345, 2347-2350.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { fmtPct, fmtPrice, sigClass } from '../core/format.js';
import { STOCKS } from '../data/symbols.js';
import { S } from '../state/store.js';
import { applyEarningsGate } from '../strategy/earnings.js';
import { renderLevelsBox } from './levels-box.js';
import { applyPremiumState } from './premium.js';
import { renderTradeLog } from './trade-log.js';

export function refreshModalSignals(sym) {
  const overlay = document.getElementById('stockModal');
  if (!overlay || !overlay.classList.contains('open')) return;
  if (S.currentSym !== sym) return;

  const d   = S.data[sym];
  const sig = S.signals[sym];
  if (!d) return;

  // Price row
  const priceEl = document.getElementById('modalPrice');
  if (priceEl) { priceEl.textContent = fmtPrice(d.price, d.currency); priceEl.style.color = ''; }
  const cb = document.getElementById('modalChange');
  if (cb) {
    cb.textContent = fmtPct(d.changePct);
    cb.className   = 'change-badge ' + (d.changePct >= 0 ? 'pos' : 'neg');
  }

  if (!sig) return;
  const pSig = sig.precision, mSig = sig.momentum, meta = sig.meta || {};

  // Precision signal
  const ps = document.getElementById('modalPrecSignal');
  if (ps) { ps.textContent = pSig?.label || 'N/A'; ps.className = `big-signal sig-badge ${sigClass(pSig?.label)}`; }
  const pd = document.getElementById('modalPrecDetail');
  if (pd) pd.textContent = pSig?.detail || '—';

  // Momentum signal
  const ms = document.getElementById('modalMomSignal');
  if (ms) { ms.textContent = mSig?.label || 'N/A'; ms.className = `big-signal sig-badge ${sigClass(mSig?.label)}`; }
  const md = document.getElementById('modalMomDetail');
  if (md) md.textContent = mSig?.detail || '—';

  // Metrics
  const metricsEl = document.getElementById('modalMetrics');
  if (metricsEl) metricsEl.innerHTML = `
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.pct21!=null?(Math.abs(meta.pct21)<3?'prec':''):''}">${meta.pct21!=null?(meta.pct21>=0?'+':'')+meta.pct21.toFixed(1)+'%':'—'}</div>
      <div class="sig-metric-label">vs 21 EMA</div>
    </div>
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.pct50!=null?(meta.pct50>0?'pos':'neg'):''}">${meta.pct50!=null?(meta.pct50>=0?'+':'')+meta.pct50.toFixed(1)+'%':'—'}</div>
      <div class="sig-metric-label">vs 50 EMA</div>
    </div>
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.volRatio!=null?(meta.volRatio<0.75?'prec':meta.volRatio>1.4?'mom':''):''}">${meta.volRatio!=null?Math.round(meta.volRatio*100)+'%':'—'}</div>
      <div class="sig-metric-label">Volume vs 20d avg</div>
    </div>`;

  // Levels & TA
  renderLevelsBox(sym);
}

export function openModal(sym) {
  const stk  = STOCKS.find(s => s.sym === sym);
  if (!stk) return;
  S.currentSym = sym;
  const d   = S.data[sym];
  const sig = S.signals[sym];
  const ac  = S.adminContent[sym] || {};
  // Earnings now arrive with the price data (snapshot field, refreshed by the
  // TradingView earnings_release_next_date column), so the old per-symbol
  // side-fetch here is gone. It raced four dead endpoints and always resolved
  // null; removing it also breaks the modal -> grid import cycle.

  // Head
  document.getElementById('modalEyebrow').innerHTML =
    `<span class="theme-badge tb-${stk.theme}">${stk.theme}</span>
     <span class="theme-badge" style="background:rgba(255,255,255,.05);color:var(--t2);border:1px solid var(--border)">${stk.ex}</span>`;
  document.getElementById('modalTicker').textContent = stk.sym;
  document.getElementById('modalName').textContent   = stk.name + ' — ' + stk.desc;

  const modalPriceEl = document.getElementById('modalPrice');
  const modalChangeCb = document.getElementById('modalChange');
  if (d) {
    modalPriceEl.textContent = fmtPrice(d.price, d.currency);
    modalChangeCb.textContent = fmtPct(d.changePct);
    modalChangeCb.className   = 'change-badge ' + (d.changePct >= 0 ? 'pos' : 'neg');
  } else {
    modalPriceEl.textContent  = 'Fetching…';
    modalPriceEl.style.color  = 'var(--t3)';
    modalChangeCb.textContent = '';
    modalChangeCb.className   = 'change-badge load';
  }

  // Chart links
  const tvSym  = `${stk.ex}:${sym}`;
  const icSlug = stk.ic || sym.toLowerCase();
  const icUrl  = `https://www.investing.com/equities/${icSlug}`;
  const tvUrl  = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSym)}`;
  const yfUrl  = `https://finance.yahoo.com/quote/${sym}`;

  document.getElementById('modalChartLinks').innerHTML = `
    <a class="chart-link" href="${tvUrl}" target="_blank" rel="noopener">📊 TradingView ↗</a>
    <a class="chart-link" href="${icUrl}" target="_blank" rel="noopener">📈 Investing.com ↗</a>
    <a class="chart-link" href="${yfUrl}" target="_blank" rel="noopener">💹 Yahoo Finance ↗</a>
  `;

  // TradingView embedded chart — dark theme, daily, full toolbar so user can add 21/50 EMA manually
  const tvEmbedSym = encodeURIComponent(tvSym);
  document.getElementById('modalChartFrame').innerHTML = `
    <iframe
      src="https://s.tradingview.com/widgetembed/?frameElementId=tv_${sym}&symbol=${tvEmbedSym}&interval=D&hide_side_toolbar=0&allow_symbol_change=0&save_image=0&theme=dark&style=1&locale=en&withdateranges=1&toolbar_bg=%23080810"
      allowtransparency="true" frameborder="0"
      style="width:100%;height:380px;border:none;"
      title="TradingView chart for ${sym}">
    </iframe>
    <p style="font-size:11px;color:var(--t3);margin:6px 0 16px;text-align:right;">
      Chart powered by <a href="https://www.tradingview.com" target="_blank" rel="noopener" style="color:var(--t2);text-decoration:none;">TradingView</a> ·
      Full analysis on <a href="${icUrl}" target="_blank" rel="noopener" style="color:var(--t2);text-decoration:none;">Investing.com</a> ·
      Price data via <a href="${yfUrl}" target="_blank" rel="noopener" style="color:var(--t2);text-decoration:none;">Yahoo Finance</a>
    </p>`;

  // Auto signals — populate if data ready; worker will call refreshModalSignals() if not yet
  const meta = sig?.meta || {};
  const pSig = sig?.precision;
  const mSig = sig?.momentum;
  const loadingMsg = d ? '—' : '⏳ Fetching live data — signals will appear in a moment…';

  const ps = document.getElementById('modalPrecSignal');
  ps.textContent  = pSig?.label || (d ? 'N/A' : '…');
  ps.className    = `big-signal sig-badge ${pSig ? sigClass(pSig.label) : 'sig-LOADING'}`;
  document.getElementById('modalPrecDetail').textContent = pSig?.detail || loadingMsg;

  const ms = document.getElementById('modalMomSignal');
  ms.textContent = mSig?.label || (d ? 'N/A' : '…');
  ms.className   = `big-signal sig-badge ${mSig ? sigClass(mSig.label) : 'sig-LOADING'}`;
  document.getElementById('modalMomDetail').textContent = mSig?.detail || loadingMsg;

  // Metrics
  document.getElementById('modalMetrics').innerHTML = `
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.pct21!=null?(Math.abs(meta.pct21)<3?'prec':''):''}">${meta.pct21!=null?(meta.pct21>=0?'+':'')+meta.pct21.toFixed(1)+'%':'—'}</div>
      <div class="sig-metric-label">vs 21 EMA</div>
    </div>
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.pct50!=null?(meta.pct50>0?'pos':'neg'):''}">${meta.pct50!=null?(meta.pct50>=0?'+':'')+meta.pct50.toFixed(1)+'%':'—'}</div>
      <div class="sig-metric-label">vs 50 EMA</div>
    </div>
    <div class="sig-metric">
      <div class="sig-metric-val ${meta.volRatio!=null?(meta.volRatio<0.75?'prec':meta.volRatio>1.4?'mom':''):''}">${meta.volRatio!=null?Math.round(meta.volRatio*100)+'%':'—'}</div>
      <div class="sig-metric-label">Volume vs 20d avg</div>
    </div>
  `;

  renderLevelsBox(sym);

  // Analyst tabs — Precision
  renderAnalystTab('prec', ac.precision, stk, 'Sai', 'Precision Desk');
  renderAnalystTab('mom',  ac.momentum,  stk, 'Iravan', "Iravan's Desk");

  // Trade Log
  renderTradeLog(sym);

  // Premium state
  applyPremiumState();

  // Open modal
  switchModalTab('auto');
  document.getElementById('stockModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function renderAnalystTab(deskKey, content, stk, analystName, deskName) {
  const commentaryEl  = document.getElementById(`${deskKey}Commentary`);
  const screenshotEl  = document.getElementById(`${deskKey}Screenshot`);

  if (content && content.analysis) {
    commentaryEl.innerHTML = `
      <div class="analyst-meta">
        <div class="analyst-avatar-sm ${deskKey}">${analystName.charAt(0)}</div>
        <div>
          <div class="analyst-name">${analystName} · ${deskName}</div>
          <div class="analyst-updated">${content.updatedAt ? 'Updated ' + new Date(content.updatedAt).toLocaleDateString('en-GB') : ''}</div>
        </div>
        ${content.signalOverride ? `<span class="sig-badge ${sigClass(content.signalOverride)}" style="margin-left:auto;padding:5px 12px;font-size:12px;">${content.signalOverride}</span>` : ''}
      </div>
      <div class="analyst-text">${content.analysis.replace(/\n/g,'<br>')}</div>
    `;
    if (content.screenshotUrl) {
      screenshotEl.innerHTML  = `<img src="${content.screenshotUrl}" alt="${stk.sym} chart" onerror="this.parentElement.style.display='none'">`;
      screenshotEl.style.display = 'block';
    } else {
      screenshotEl.style.display = 'none';
    }
  } else {
    commentaryEl.innerHTML = `<div class="analyst-no-content">No analyst commentary added yet for ${stk.sym} — <em>${deskName}</em>.</div>`;
    screenshotEl.style.display = 'none';
  }
}

export function handleModalClick(e) {
  if (e.target === document.getElementById('stockModal')) closeModal();
}

export function closeModal() {
  document.getElementById('stockModal').classList.remove('open');
  document.body.style.overflow = '';
  S.currentSym = null;
  // Clear iframe to stop loading
  setTimeout(() => { document.getElementById('modalChartFrame').innerHTML = ''; }, 300);
}

export function switchModalTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-'+tab));
}
