/* Alpha-Seeker — app/main.js
   Entry point. Loaded as <script type="module">, so nothing here is global;
   all DOM wiring goes through js/app/actions.js (delegated [data-action]) and
   the pipeline reports progress through js/core/emitter.js.

   Derived from initEvents()/init() at Alpha-Seeker.html lines 2772-2826, plus
   the newsletter IIFE that used to sit in its own <script> at 2830-2856. */

import { on } from '../core/emitter.js';
import { STOCKS, loadUniverse } from '../data/symbols.js';
import { S } from '../state/store.js';
import { initActions } from './actions.js';
import { loadAll } from './load.js';
import { renderGrid, renderCard, updateStatusBar } from '../ui/grid.js';
import { closeModal, refreshModalSignals } from '../ui/modal.js';
import { showAdmin, closeAdmin, loadAdminContent } from '../ui/admin/panel.js';
import { loadMacro } from '../ui/macro.js';
import { initNewsletter } from '../ui/newsletter.js';

function initEvents() {
  // Theme tabs
  document.getElementById('themeTabs').addEventListener('click', e => {
    const btn = e.target.closest('.theme-tab');
    if (!btn) return;
    document.querySelectorAll('.theme-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.activeTheme = btn.dataset.theme;
    renderGrid();
    S.data && Object.keys(S.data).length && STOCKS.forEach(s => {
      if (document.getElementById(`card-${s.sym}`)) renderCard(s);
    });
  });

  // Desk toggle
  document.getElementById('deskToggle').addEventListener('click', e => {
    const btn = e.target.closest('.desk-btn');
    if (!btn) return;
    document.querySelectorAll('.desk-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.activeDesk = btn.dataset.desk;
    renderGrid();
    STOCKS.forEach(s => {
      if (document.getElementById(`card-${s.sym}`)) renderCard(s);
    });
  });

  // Logo triple-click → admin
  const logoEl = document.getElementById('logoAdminTrigger');
  logoEl.addEventListener('click', () => {
    S.logoClicks++;
    clearTimeout(S.logoTimer);
    S.logoTimer = setTimeout(() => S.logoClicks = 0, 1000);
    if (S.logoClicks >= 3) { S.logoClicks = 0; showAdmin(); }
  });

  // Hash nav
  const handleHash = () => { if (location.hash === '#admin') showAdmin(); };
  window.addEventListener('hashchange', handleHash);
  handleHash();

  // Keyboard close modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeAdmin(); } });
}

/* The pipeline emits; the UI listens. This is the only place the two meet,
   which is what lets js/app/load.js import nothing from js/ui/**. */
function initPipelineBindings() {
  on('grid:rerender', () => renderGrid());

  on('grid:status', ({ text, error }) => {
    const el = document.getElementById('gridLabel');
    if (el) { el.textContent = text; el.style.color = error ? 'var(--red)' : ''; }
  });

  on('stocks:updated', ({ phase, ok }) => {
    STOCKS.forEach(s => { if (document.getElementById(`card-${s.sym}`)) renderCard(s); });
    updateStatusBar();
    if (S.currentSym) refreshModalSignals(S.currentSym);
    if (phase === 'snapshot') {
      loadMacro(S.macro);
      const m = S.snapshotMeta || {};
      const dt = document.getElementById('dataTime');
      if (dt) dt.textContent = m.lastBarDate ? `Close ${m.lastBarDate}` : '';
      // Loud, not silent: rendering months-old bars as if they were current is
      // worse than saying the pipeline has stopped.
      if (m.staleDays != null && m.staleDays > 4) {
        const el = document.getElementById('gridLabel');
        if (el) {
          el.textContent = `⚠ Data is ${m.staleDays} days old — the update workflow may have failed.`;
          el.style.color = 'var(--amber)';
        }
      }
    }
    if (phase === 'live') {
      const ls = document.getElementById('liveStatus');
      if (ls) ls.textContent = ok ? `${ok}/${STOCKS.length} live` : 'last close';
      const dt = document.getElementById('dataTime');
      if (ok && dt) {
        dt.textContent = 'Prices at ' + new Date()
          .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
    }
  });
}

async function init() {
  initActions();
  initPipelineBindings();
  initNewsletter();
  try {
    await loadUniverse();
  } catch (e) {
    console.error('[AlphaSeeker] could not load the symbol universe:', e);
    const el = document.getElementById('gridLabel');
    if (el) { el.textContent = 'Could not load the symbol list.'; el.style.color = 'var(--red)'; }
    return;
  }
  loadAdminContent();
  renderGrid();
  initEvents();
  await loadAll();
}

init();
