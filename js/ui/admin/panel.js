/* Alpha-Seeker — panel.js
   Moved verbatim from Alpha-Seeker.html lines 802-802, 2381-2386, 2388-2399, 2401-2409, 2411-2423, 2425-2436, 2438-2440, 2442-2553, 2555-2570, 2572-2579, 2581-2607, 2609-2619.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { STOCKS } from '../../data/symbols.js';
import { S } from '../../state/store.js';
import { renderCard } from '../grid.js';
import { renderAnalystTab } from '../modal.js';
import { applyPremiumState } from '../premium.js';
import { checkAdminPassphrase, grantAdmin } from '../../auth/entitlements.js';
import { renderTlAdminEntries } from './trade-log.js';


export function loadAdminContent() {
  try {
    const raw = localStorage.getItem('tad_admin');
    if (raw) S.adminContent = JSON.parse(raw);
  } catch(e) {}
}

export function saveAdminContent(sym, desk, obj) {
  if (!S.adminContent[sym]) S.adminContent[sym] = {};
  S.adminContent[sym][desk] = { ...obj, updatedAt: new Date().toISOString() };
  try { localStorage.setItem('tad_admin', JSON.stringify(S.adminContent)); } catch(e){}
  renderCard(STOCKS.find(s => s.sym === sym));
  if (S.currentSym === sym) {
    const stk = STOCKS.find(s => s.sym === sym);
    const ac  = S.adminContent[sym];
    if (desk === 'precision') renderAnalystTab('prec', ac.precision, stk, 'Sai', 'Precision Desk');
    else renderAnalystTab('mom', ac.momentum, stk, 'Iravan', "Iravan's Desk");
  }
}

export function showAdmin() {
  const overlay = document.getElementById('adminOverlay');
  overlay.classList.add('open');
  if (S.isAdmin) {
    renderAdminPanel();
  } else {
    renderAdminLogin();
  }
}

export function renderAdminLogin() {
  document.getElementById('adminInner').innerHTML = `
    <div class="admin-login">
      <div style="font-size:32px;margin-bottom:12px">🔐</div>
      <h2>Admin Access</h2>
      <p>Enter your admin password to access the content management panel</p>
      <input class="admin-login-input" type="password" id="adminPwInput" placeholder="Password" data-action="admin:pw-key">
      <button class="btn btn-primary" style="width:100%;justify-content:center;" data-action="admin:pw-submit">Enter Admin Panel</button>
      <div class="admin-login-error" id="adminLoginError">Incorrect password</div>
      <button style="margin-top:16px;background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit" data-action="admin:close">Cancel</button>
    </div>`;
  setTimeout(() => document.getElementById('adminPwInput')?.focus(), 100);
}

export async function checkAdminPw() {
  const pw = document.getElementById('adminPwInput')?.value;
  // Passphrase comparison now lives in js/auth/entitlements.js, which hashes it
  // instead of shipping the plaintext the monolith had at line 802. That file
  // also documents why this is obfuscation and not a security boundary.
  if (await checkAdminPassphrase(pw)) {
    grantAdmin();
    applyPremiumState();
    renderAdminPanel();
  } else {
    const err = document.getElementById('adminLoginError');
    if (err) { err.style.display = 'block'; setTimeout(() => err.style.display='none', 2000); }
  }
}

export function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
}

export function renderAdminPanel() {
  const opts = STOCKS.map(s => `<option value="${s.sym}">${s.sym} — ${s.name}</option>`).join('');
  const pubGrid = STOCKS.map(s => {
    const ac = S.adminContent[s.sym] || {};
    return `<div class="pub-item"><span>${s.sym}</span><div class="pub-dots">
      <div class="pub-dot ${ac.precision?.analysis?'set':''}" title="Precision"></div>
      <div class="pub-dot ${ac.momentum?.analysis?'set':''}" title="Momentum"></div>
    </div></div>`;
  }).join('');

  document.getElementById('adminInner').innerHTML = `
    <div class="admin-panel">
      <div class="admin-head">
        <div>
          <h2>🛠️ Alpha Seeker — Content Panel</h2>
          <p>Add analyst commentary and chart screenshots. Saved to this browser — migrate to a backend for production.</p>
        </div>
        <button class="modal-close" data-action="admin:close">✕</button>
      </div>
      <div class="admin-body">
        <div class="admin-row">
          <span class="admin-label">Stock</span>
          <select class="admin-select" id="adminStockSel" data-action="admin:load-stock" style="min-width:280px;">${opts}</select>
        </div>

        <div class="admin-desk-tabs">
          <button class="admin-desk-tab active" data-addesk="precision" data-action="admin:desk" data-desk="precision">🎯 Precision Desk (Sai)</button>
          <button class="admin-desk-tab" data-addesk="momentum" data-action="admin:desk" data-desk="momentum">⚡ Iravan's Desk</button>
          <button class="admin-desk-tab" data-addesk="tradelog" data-action="admin:desk" data-desk="tradelog" style="border-color:rgba(0,200,240,.2)">📋 Trade Log</button>
        </div>

        <!-- PRECISION FORM -->
        <div class="admin-content-area active" id="adminArea-precision">
          <div class="admin-field">
            <label>Signal Override</label>
            <select class="admin-select" id="prec-sigOverride">
              <option value="">Use auto-signal</option>
              <option>PRECISION LONG ⚡</option>
              <option>APPROACHING 👀</option>
              <option>EXTENDED ⏸</option>
              <option>WATCH 🔍</option>
              <option>SELL ALERT 🚨</option>
              <option>AVOID ❌</option>
            </select>
          </div>
          <div class="admin-field">
            <label>Your Analysis (Precision Desk view)</label>
            <textarea class="admin-textarea" id="prec-analysis" placeholder="e.g. NVDA is forming a textbook 21 EMA pullback after a 28% run from the last base. Volume dried up to 65% of its 20-day average — exactly what we want. I'm watching for a bounce entry Monday morning above $XXX. Stop is below the 21 EMA at $XXX. Thesis: AI capex cycle intact, NVDA is the pick-and-shovel play."></textarea>
          </div>
          <div class="admin-field">
            <label>Chart Screenshot URL (from Imgur, TradingView, etc)</label>
            <input class="admin-input" id="prec-screenshot" type="url" placeholder="https://i.imgur.com/your-chart.png" data-action="admin:preview" data-prefix="prec">
            <img id="prec-imgPreview" class="img-preview" alt="Preview">
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
            <button class="admin-save-btn prec" data-action="admin:save" data-desk="precision">Save Precision Analysis</button>
            <span class="admin-save-status" id="prec-saveStatus">✓ Saved</span>
          </div>
        </div>

        <!-- MOMENTUM FORM -->
        <div class="admin-content-area" id="adminArea-momentum">
          <div class="admin-field">
            <label>Signal Override</label>
            <select class="admin-select" id="mom-sigOverride">
              <option value="">Use auto-signal</option>
              <option>MOMENTUM LONG 🔥</option>
              <option>BUILD POSITION 📈</option>
              <option>VOLUME SURGE ⚡</option>
              <option>HOLD / WATCH</option>
              <option>WAIT 🕐</option>
              <option>SELL ALERT 🚨</option>
              <option>AVOID ❌</option>
            </select>
          </div>
          <div class="admin-field">
            <label>Your Analysis (Iravan's Desk view)</label>
            <textarea class="admin-textarea" id="mom-analysis" placeholder="e.g. RKLB is near its 20-day high after consolidating for 3 weeks. I'm building a DCA position here with a first tranche at market open. The macro thesis is intact — launch demand is surging and RKLB is the only small-sat launch company with a fully vertically integrated model. Volume has picked up the last 2 sessions. First target: $XXX for +30%, stop at $XXX."></textarea>
          </div>
          <div class="admin-field">
            <label>Chart Screenshot URL</label>
            <input class="admin-input" id="mom-screenshot" type="url" placeholder="https://i.imgur.com/your-chart.png" data-action="admin:preview" data-prefix="mom">
            <img id="mom-imgPreview" class="img-preview" alt="Preview">
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
            <button class="admin-save-btn mom" data-action="admin:save" data-desk="momentum">Save Momentum Analysis</button>
            <span class="admin-save-status" id="mom-saveStatus">✓ Saved</span>
          </div>
        </div>

        <!-- TRADE LOG FORM -->
        <div class="admin-content-area" id="adminArea-tradelog">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
            <p style="font-size:13px;color:var(--t2)">Add BNS-style entries: entry price, stop, pattern and notes. Each stock has its own log.</p>
            <button class="btn btn-primary btn-sm" data-action="tl:add">+ Add Entry</button>
          </div>
          <div class="tl-admin-entries" id="tlAdminEntries"><!-- rendered by JS --></div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
            <button class="admin-save-btn prec" data-action="tl:save">Save Trade Log</button>
            <span class="admin-save-status" id="tl-saveStatus">✓ Saved</span>
          </div>
        </div>

        <div class="published-list">
          <h3>Content Status</h3>
          <div class="published-grid" id="publishedGrid">${pubGrid}</div>
        </div>
      </div>
    </div>
  `;
  loadAdminStock();
}

export function loadAdminStock() {
  const sym = document.getElementById('adminStockSel')?.value;
  if (!sym) return;
  const ac = S.adminContent[sym] || {};
  ['precision','momentum'].forEach(desk => {
    const c = ac[desk] || {};
    const so = document.getElementById(`${desk.slice(0,4)}-sigOverride`);
    const ta = document.getElementById(`${desk.slice(0,4)}-analysis`);
    const sc = document.getElementById(`${desk.slice(0,4)}-screenshot`);
    if (so) so.value = c.signalOverride || '';
    if (ta) ta.value = c.analysis || '';
    if (sc) { sc.value = c.screenshotUrl || ''; previewImg(desk.slice(0,4)); }
  });
  // Load trade log entries for this stock
  renderTlAdminEntries(sym);
}

export function switchAdminDesk(desk) {
  document.querySelectorAll('.admin-desk-tab').forEach(b => b.classList.toggle('active', b.dataset.addesk === desk));
  document.querySelectorAll('.admin-content-area').forEach(a => a.classList.toggle('active', a.id === `adminArea-${desk}`));
  if (desk === 'tradelog') {
    const sym = document.getElementById('adminStockSel')?.value;
    if (sym) renderTlAdminEntries(sym);
  }
}

export function saveAdmin(desk) {
  const sym = document.getElementById('adminStockSel')?.value;
  if (!sym) return;
  const prefix = desk === 'precision' ? 'prec' : 'mom';
  const obj = {
    signalOverride: document.getElementById(`${prefix}-sigOverride`)?.value || '',
    analysis:       document.getElementById(`${prefix}-analysis`)?.value   || '',
    screenshotUrl:  document.getElementById(`${prefix}-screenshot`)?.value || '',
  };
  saveAdminContent(sym, desk, obj);
  const status = document.getElementById(`${prefix}-saveStatus`);
  if (status) {
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 2500);
  }
  // Refresh published grid
  const grid = document.getElementById('publishedGrid');
  if (grid) {
    grid.innerHTML = STOCKS.map(s => {
      const ac = S.adminContent[s.sym] || {};
      return `<div class="pub-item"><span>${s.sym}</span><div class="pub-dots">
        <div class="pub-dot ${ac.precision?.analysis?'set':''}" title="Precision"></div>
        <div class="pub-dot ${ac.momentum?.analysis?'set':''}" title="Momentum"></div>
      </div></div>`;
    }).join('');
  }
}

export function previewImg(prefix) {
  const url = document.getElementById(`${prefix}-screenshot`)?.value;
  const img = document.getElementById(`${prefix}-imgPreview`);
  if (!img) return;
  if (url && url.startsWith('http')) {
    img.src = url;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
}
