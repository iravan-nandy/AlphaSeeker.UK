/* Alpha-Seeker — trade-log.js
   Moved verbatim from Alpha-Seeker.html lines 2624-2624, 2626-2631, 2633-2710, 2712-2720, 2722-2726, 2728-2746, 2748-2760.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { STOCKS } from '../../data/symbols.js';
import { S } from '../../state/store.js';
import { renderCard } from '../grid.js';
import { renderTradeLog } from '../trade-log.js';

export let _tlDraft = []; // in-memory draft for current stock

export function renderTlAdminEntries(sym) {
  if (!sym) return;
  const ac = S.adminContent[sym] || {};
  _tlDraft = JSON.parse(JSON.stringify(ac.tradeLog || []));
  renderTlAdminUI();
}

export function renderTlAdminUI() {
  const container = document.getElementById('tlAdminEntries');
  if (!container) return;

  if (!_tlDraft.length) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--t3);font-size:13px;border:1px dashed var(--border);border-radius:9px">No entries yet — click "+ Add Entry" to log a trade.</div>`;
    return;
  }

  const PATTERNS = ['Cup & Handle Breakout','21 EMA Pullback','Price Tightening','VCP (Volatility Contraction)','Flat Base Breakout','Inside Day Breakout','Support Reclaim','20-day High Breakout','Other'];

  container.innerHTML = _tlDraft.map((e, i) => {
    const isExit = e.action === 'EXIT';
    return `
    <div class="tl-admin-entry">
      <div class="tl-admin-entry-head">
        <span class="tl-entry-num">Entry ${_tlDraft.length - i}</span>
        <button class="tl-delete-btn" data-action="tl:delete" data-i="${i}">✕ Remove</button>
      </div>
      <div class="tl-admin-grid">
        <div class="admin-field">
          <label>Action</label>
          <select class="admin-select" id="tl-${i}-action" data-action="tl:rerender" style="width:100%">
            <option ${e.action==='BUY'?'selected':''}>BUY</option>
            <option ${e.action==='ADD'?'selected':''}>ADD</option>
            <option ${e.action==='EXIT'?'selected':''}>EXIT</option>
            <option ${e.action==='WATCH'?'selected':''}>WATCH</option>
          </select>
        </div>
        <div class="admin-field">
          <label>Date</label>
          <input class="admin-input" id="tl-${i}-date" type="date" value="${e.date||''}" style="width:100%">
        </div>
        <div class="admin-field" style="grid-column:1/-1">
          <label>Pattern / Setup</label>
          <select class="admin-select" id="tl-${i}-pattern" style="width:100%">
            ${PATTERNS.map(p => `<option ${e.pattern===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        ${!isExit ? `
        <div class="admin-field">
          <label>Entry / Limit Price ($)</label>
          <input class="admin-input" id="tl-${i}-entryLimit" type="number" step="0.01" value="${e.entryLimit||''}" placeholder="e.g. 77.60" style="width:100%">
        </div>
        <div class="admin-field">
          <label>Stop Loss Price ($)</label>
          <input class="admin-input" id="tl-${i}-stopPrice" type="number" step="0.01" value="${e.stopPrice||''}" placeholder="e.g. 75.35" style="width:100%">
        </div>
        <div class="admin-field">
          <label>Stop Distance (%)</label>
          <input class="admin-input" id="tl-${i}-stopPct" type="number" step="0.1" value="${e.stopPct||''}" placeholder="e.g. 2.9" style="width:100%">
        </div>
        ` : `
        <div class="admin-field">
          <label>Exit Price ($)</label>
          <input class="admin-input" id="tl-${i}-exitPrice" type="number" step="0.01" value="${e.exitPrice||''}" placeholder="e.g. 83.88" style="width:100%">
        </div>
        <div class="admin-field">
          <label>Return / P&L (%)</label>
          <input class="admin-input" id="tl-${i}-pnlPct" type="number" step="0.1" value="${e.pnlPct||''}" placeholder="e.g. 8.1" style="width:100%">
        </div>
        <div class="admin-field">
          <label>Exit Reason</label>
          <input class="admin-input" id="tl-${i}-exitReason" value="${e.exitReason||''}" placeholder="e.g. Into strength, correction to 21EMA expected" style="width:100%">
        </div>
        `}
        <div class="admin-field" style="grid-column:1/-1">
          <label>Notes (your annotation)</label>
          <textarea class="admin-textarea" id="tl-${i}-notes" style="min-height:80px">${e.notes||''}</textarea>
        </div>
        <div class="admin-field" style="grid-column:1/-1">
          <label>Chart Screenshot URL (Imgur / TradingView)</label>
          <input class="admin-input" id="tl-${i}-screenshot" type="url" value="${e.screenshotUrl||''}" placeholder="https://i.imgur.com/..." style="width:100%">
        </div>
      </div>
    </div>`;
  }).join('');
}

export function addTradeLogEntry() {
  // Save current field values before adding new entry
  _collectTlDraft();
  _tlDraft.unshift({
    action: 'BUY', date: new Date().toISOString().slice(0,10),
    pattern: '21 EMA Pullback', entryLimit:'', stopPrice:'', stopPct:'', notes:'', screenshotUrl:''
  });
  renderTlAdminUI();
}

export function deleteTlEntry(i) {
  _collectTlDraft();
  _tlDraft.splice(i, 1);
  renderTlAdminUI();
}

export function _collectTlDraft() {
  _tlDraft.forEach((e, i) => {
    const g = (id) => document.getElementById(`tl-${i}-${id}`)?.value || '';
    e.action       = g('action') || e.action;
    e.date         = g('date')   || e.date;
    e.pattern      = g('pattern')|| e.pattern;
    e.notes        = g('notes')  || '';
    e.screenshotUrl= g('screenshot') || '';
    if (e.action !== 'EXIT') {
      e.entryLimit = g('entryLimit') || '';
      e.stopPrice  = g('stopPrice')  || '';
      e.stopPct    = g('stopPct')    || '';
    } else {
      e.exitPrice  = g('exitPrice')  || '';
      e.pnlPct     = g('pnlPct')     || '';
      e.exitReason = g('exitReason') || '';
    }
  });
}

export function saveTradeLog() {
  _collectTlDraft();
  const sym = document.getElementById('adminStockSel')?.value;
  if (!sym) return;
  if (!S.adminContent[sym]) S.adminContent[sym] = {};
  S.adminContent[sym].tradeLog = _tlDraft;
  try { localStorage.setItem('tad_admin', JSON.stringify(S.adminContent)); } catch(e) {}
  // Refresh card and modal if open
  renderCard(STOCKS.find(s => s.sym === sym));
  if (S.currentSym === sym) renderTradeLog(sym);
  const status = document.getElementById('tl-saveStatus');
  if (status) { status.classList.add('show'); setTimeout(() => status.classList.remove('show'), 2500); }
}
