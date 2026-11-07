/* Alpha-Seeker — trade-log.js
   Moved verbatim from Alpha-Seeker.html lines 2242-2333.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { S } from '../state/store.js';

export function renderTradeLog(sym) {
  const el = document.getElementById('tradeLogContent');
  if (!el) return;
  const ac = S.adminContent[sym] || {};
  const entries = (ac.tradeLog || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const d = S.data[sym];
  const cur = d ? d.currency : 'USD';
  const cs = cur === 'GBp' ? 'p' : (cur === 'GBP' ? '£' : '$');

  if (!entries.length) {
    el.innerHTML = `<div class="tl-empty">
      <div style="font-size:28px;margin-bottom:10px">📋</div>
      <strong>No trade entries yet for ${sym}</strong>
      <p style="margin-top:6px;font-size:13px">Sai will post entries as trades are placed.</p>
    </div>`;
    return;
  }

  const html = entries.map((e, i) => {
    const isExit = e.action === 'EXIT';
    const isBuyAdd = e.action === 'BUY' || e.action === 'ADD';
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '—';

    let pricesHTML = '';
    if (isBuyAdd) {
      pricesHTML = `
        <div class="tl-prices">
          <div class="tl-price-item">
            <div class="tl-price-label">Entry / Limit</div>
            <div class="tl-price-val prec">${e.entryLimit ? cs+parseFloat(e.entryLimit).toFixed(2) : '—'}</div>
          </div>
          <div class="tl-price-item">
            <div class="tl-price-label">Stop Loss</div>
            <div class="tl-price-val red">${e.stopPrice ? cs+parseFloat(e.stopPrice).toFixed(2) : '—'}</div>
          </div>
          <div class="tl-price-item">
            <div class="tl-price-label">Stop Distance</div>
            <div class="tl-price-val red">${e.stopPct ? e.stopPct+'%' : '—'}</div>
          </div>
        </div>`;
    } else if (isExit) {
      const pnlColor = parseFloat(e.pnlPct) >= 0 ? 'green' : 'red';
      pricesHTML = `
        <div class="tl-prices">
          <div class="tl-price-item">
            <div class="tl-price-label">Exit Price</div>
            <div class="tl-price-val red">${e.exitPrice ? cs+parseFloat(e.exitPrice).toFixed(2) : '—'}</div>
          </div>
          <div class="tl-price-item">
            <div class="tl-price-label">Return</div>
            <div class="tl-price-val ${pnlColor}">${e.pnlPct ? (e.pnlPct>=0?'+':'')+e.pnlPct+'%' : '—'}</div>
          </div>
          <div class="tl-price-item">
            <div class="tl-price-label">Reason</div>
            <div class="tl-price-val" style="font-size:11px;color:var(--t2)">${e.exitReason || 'Into strength'}</div>
          </div>
        </div>`;
    }

    const screenshotHTML = e.screenshotUrl
      ? `<div class="tl-screenshot"><img src="${e.screenshotUrl}" alt="${sym} trade chart" onerror="this.parentElement.style.display='none'"></div>`
      : '';

    const notesHTML = e.notes
      ? `<div class="tl-notes">${e.notes.replace(/\n/g,'<br>')}</div>`
      : '';

    return `
      <div class="tl-entry">
        <div class="tl-entry-head">
          <span class="tl-action ${e.action || 'BUY'}">${e.action || 'BUY'}</span>
          <span class="tl-date">${dateStr}</span>
          ${e.pattern ? `<span class="tl-pattern">— ${e.pattern}</span>` : ''}
        </div>
        <div class="tl-body">
          ${pricesHTML}
          ${notesHTML}
          ${screenshotHTML}
        </div>
      </div>`;
  }).join('<div class="tl-divider">older entries</div>');

  el.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;font-weight:600">Sai's Trade Log · ${sym}</span>
      <span style="font-size:11px;color:var(--t3);margin-left:auto">${entries.length} entr${entries.length===1?'y':'ies'}</span>
    </div>
    <div class="tl-timeline">${html}</div>
    <p style="margin-top:16px;font-size:11px;color:var(--t3);text-align:center">
      For educational purposes only · Not financial advice · Stop levels shown are Sai's personal risk management
    </p>`;
}
