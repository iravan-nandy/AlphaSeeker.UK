/* Alpha-Seeker — grid.js
   Moved verbatim from Alpha-Seeker.html lines 1883-1897, 1899-1901, 1903-1918, 1920-2022, 2024-2036, 2765-2767.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { fmtPct, fmtPrice, sigClass, sparklineSVG } from '../core/format.js';
import { STOCKS } from '../data/symbols.js';
import { S } from '../state/store.js';
import { openModal } from './modal.js';

export function getSortedStocks() {
  const filtered = STOCKS.filter(s =>
    (S.activeTheme === 'all' || s.theme === S.activeTheme)
  );
  return filtered.sort((a, b) => {
    const sa = S.signals[a.sym], sb = S.signals[b.sym];
    const getStr = (sig) => {
      if (!sig) return -5;
      if (S.activeDesk === 'precision') return sig.precision?.strength ?? 0;
      if (S.activeDesk === 'momentum')  return sig.momentum?.strength  ?? 0;
      return Math.max(sig.precision?.strength ?? 0, sig.momentum?.strength ?? 0);
    };
    return getStr(sb) - getStr(sa);
  });
}

export function visibleCount() {
  return STOCKS.filter(s => S.activeTheme === 'all' || s.theme === S.activeTheme).length;
}

export function renderGrid() {
  const grid = document.getElementById('screenerGrid');
  const stocks = getSortedStocks();
  if (!stocks.length) {
    grid.innerHTML = '<div class="no-results">No stocks match the current filter.</div>';
    return;
  }
  grid.innerHTML = '';
  stocks.forEach(stk => {
    const el = document.createElement('div');
    el.id = `card-${stk.sym}`;
    grid.appendChild(el);
    renderCard(stk);
  });
  document.getElementById('gridLabel').textContent = stocks.length + ' stocks · sorted by signal strength';
}

export function renderCard(stk) {
  const el = document.getElementById(`card-${stk.sym}`);
  if (!el) return;

  const d   = S.data[stk.sym];
  const sig = S.signals[stk.sym];
  const isLoading = S.loading.has(stk.sym);
  const ac  = S.adminContent[stk.sym] || {};

  const pSig = sig?.precision;
  const mSig = sig?.momentum;

  // Show which signals to display based on desk toggle
  const showPrec = S.activeDesk !== 'momentum';
  const showMom  = S.activeDesk !== 'precision';

  // Top border class
  let cardClass = 'stock-card';
  if (pSig?.strength >= 4) cardClass += ' sig-precision-buy';
  else if (mSig?.strength >= 4) cardClass += ' sig-momentum-buy';
  else if (pSig?.strength < 0 || mSig?.strength < 0) cardClass += ' sig-sell';

  const changeCls = !d ? 'load' : d.changePct >= 0 ? 'pos' : 'neg';
  const changeStr = !d ? '—' : fmtPct(d.changePct);
  const priceStr  = !d ? (isLoading ? 'Loading…' : '—') : fmtPrice(d.price, d.currency);

  let sigBadgesHTML = '';
  if (isLoading && !d) {
    sigBadgesHTML = `<div class="sig-badge sig-LOADING"><span>Loading signals…</span></div>`;
  } else if (!d) {
    sigBadgesHTML = `<div class="sig-badge sig-NA"><span>Data unavailable</span></div>`;
  } else {
    if (showPrec && pSig) {
      sigBadgesHTML += `
        <div class="sig-badge ${sigClass(pSig.label)}">
          <span class="sig-badge-label">🎯 Precision</span>
          <span class="sig-badge-val">${pSig.label}</span>
        </div>`;
    }
    if (showMom && mSig) {
      sigBadgesHTML += `
        <div class="sig-badge ${sigClass(mSig.label)}">
          <span class="sig-badge-label">🔥 Momentum</span>
          <span class="sig-badge-val">${mSig.label}</span>
        </div>`;
    }
  }

  const meta = sig?.meta || {};
  const metaRow = d ? `
    <div class="card-meta-row">
      ${meta.pct21 != null ? `<span>21EMA: <strong style="color:${Math.abs(meta.pct21)<3?'var(--prec)':'var(--t2)'}">${meta.pct21>=0?'+':''}${meta.pct21.toFixed(1)}%</strong></span>` : ''}
      ${meta.volRatio != null ? `<span>Vol: <strong style="color:${meta.volRatio<0.75?'var(--prec)':meta.volRatio>1.4?'var(--mom)':'var(--t2)'}">${Math.round(meta.volRatio*100)}%</strong></span>` : ''}
    </div>` : '';

const ta = sig && sig.ta;
  let taRow = '';
  if (d && ta) {
    const bits = [];
    if (ta.rsi != null) bits.push(`<span>RSI <strong style="color:${ta.rsi>=70?'var(--red)':ta.rsi<=30?'var(--green)':'var(--t2)'}">${ta.rsi.toFixed(0)}</strong></span>`);
    if (ta.levels && ta.levels.support && ta.levels.support[0]) bits.push(`<span>S <strong style="color:var(--green)">${fmtPrice(ta.levels.support[0].px, d.currency)}</strong></span>`);
    if (ta.levels && ta.levels.resistance && ta.levels.resistance[0]) bits.push(`<span>R <strong style="color:var(--red)">${fmtPrice(ta.levels.resistance[0].px, d.currency)}</strong></span>`);
    if (sig.meta && sig.meta.reclaim && sig.meta.reclaim.bull) bits.push(`<span class="div-tag bullish">Reclaim</span>`);
    else if (sig.meta && sig.meta.trend==='downtrend') bits.push(`<span class="div-tag bearish">&lt;200MA</span>`);
    else if (sig.meta && sig.meta.ema200 != null) bits.push(`<span style="color:var(--t3)">&gt;200MA</span>`);
    if (ta.vol && ta.vol.pctile != null) bits.push(`<span>σ <strong style="color:${ta.vol.pctile>=80?'var(--red)':ta.vol.pctile<=20?'var(--green)':'var(--t2)'}">${ta.vol.pctile}%</strong></span>`);
    if (ta.divergence) bits.push(`<span class="div-tag ${ta.divergence.type}">${ta.divergence.type==='bullish'?'Bull div':'Bear div'}</span>`);
    const _pf = sig.meta && sig.meta.profile;
    if (_pf && _pf.best) {
      const _act = !!(sig.precision && sig.precision.edge && sig.precision.strength>=4);
      bits.push(`<span class="div-tag" style="background:${_act?'rgba(0,200,240,.16)':'rgba(148,163,184,.12)'};color:${_act?'var(--prec)':'var(--t2)'}" title="Best backtested setup for ${stk.sym}: ${_pf.best.name} (+${_pf.best.avg.toFixed(1)}% avg / ${Math.round(_pf.best.win)}% win over 10d, ${_pf.best.n}×)">${_act?'▶ ':''}Edge: ${_pf.best.short} ${Math.round(_pf.best.win)}%</span>`);
    }
    if (d.earnDays != null && d.earnDays>=0 && d.earnDays<=14) bits.push(`<span class="div-tag" style="background:rgba(245,158,11,.12);color:var(--amber)" title="Earnings ${d.earnings?d.earnings.date:''}">📅 ${d.earnDays}d</span>`);
    if (sig.risk && sig.risk.stop!=null && pSig && pSig.strength>=4) bits.push(`<span style="color:var(--t3)" title="Stop / target for the active long setup">⛔ ${sig.risk.stopPct.toFixed(1)}% · 🎯 +${sig.risk.targetPct.toFixed(1)}%</span>`);
    if (bits.length) taRow = `<div class="card-meta-row card-ta-row">${bits.join('')}</div>`;
  }
  const precSet = !!(ac.precision?.analysis);
  const momSet  = !!(ac.momentum?.analysis);

  el.className = cardClass;
  el.innerHTML = `
    <div class="card-top">
      <span class="theme-badge tb-${stk.theme}">${stk.theme}</span>
      <span class="change-badge ${changeCls}">${changeStr}</span>
    </div>
    <div class="card-ticker">${stk.sym}${d && d.beta && d.beta > 1.5 ? `<span class="beta-badge">β ${d.beta.toFixed(1)}</span>` : ''}</div>
    <div class="card-name">${stk.name}</div>
    <div class="card-desc">${stk.desc}</div>
    <div class="card-price ${!d&&isLoading?'loading':''}">${priceStr}</div>
    ${d ? `<div class="sparkline-wrap">${sparklineSVG(d.closes)}</div>` : ''}
    <div class="card-signals">${sigBadgesHTML}</div>
    ${metaRow}
    ${taRow}
    <div class="card-footer">
      <button class="view-btn" data-action="modal:open" data-sym="${stk.sym}">View Full Analysis →</button>
      <div class="analyst-indicator" title="Analyst commentary added">
        <div class="analyst-dot prec-set ${precSet?'prec-set':''}" title="${precSet?'Precision analysis added':'No precision commentary yet'}"></div>
        <div class="analyst-dot mom-set ${momSet?'mom-set':''}" title="${momSet?'Momentum analysis added':'No momentum commentary yet'}"></div>
      </div>
    </div>
  `;
  // Card click is handled by the delegated [data-action] listener in js/app/actions.js.
  // The old guard against double-firing with the .view-btn handler is no longer needed:
  // closest('[data-action]') resolves to the innermost match, and both target modal:open.
  el.dataset.action = 'modal:open';
  el.dataset.sym = stk.sym;
}

export function updateStatusBar() {
  let pc = 0, mc = 0, sc = 0;
  STOCKS.forEach(s => {
    const sig = S.signals[s.sym];
    if (!sig) return;
    if (sig.precision?.strength >= 4) pc++;
    if (sig.momentum?.strength >= 4) mc++;
    if (sig.precision?.strength < 0 || sig.momentum?.strength < 0) sc++;
  });
  document.getElementById('precCount').textContent = pc || '—';
  document.getElementById('momCount').textContent  = mc || '—';
  document.getElementById('sellCount').textContent = sc || '—';
}

export function scrollToGrid() {
  document.querySelector('.screener-section')?.scrollIntoView({ behavior:'smooth' });
}
