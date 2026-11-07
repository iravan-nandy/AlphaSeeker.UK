/* Alpha-Seeker — actions.js
   Delegated event handling. Replaces the 32 inline on* attributes the monolith
   used, which could not survive the move to ES modules (module scope is not
   global, so `onclick="foo()"` no longer resolves).

   Markup declares intent:   <button data-action="modal:tab" data-tab="auto">
   This file maps intent to behaviour. Extra params travel as data-* attributes,
   so nothing is ever interpolated into an executable string — which also fixes
   a latent bug: the old onclick="openModal('${sym}')" would break on any ticker
   containing a quote, and the symbol list becomes user-editable once portfolios
   land.

   Each action declares the event type it answers to. That matters: click,
   change, input and keydown all bubble to document, so without the `on` field a
   click on the admin <select> would also fire its change handler.

   `error` does NOT bubble, which is why the two onerror attributes on <img>
   elements are deliberately left inline. */

import { refreshAll } from './load.js';
import { openModal, closeModal, switchModalTab } from '../ui/modal.js';
import { scrollToGrid } from '../ui/grid.js';
import { togglePremium } from '../ui/premium.js';
import { showAdmin, closeAdmin, checkAdminPw, loadAdminStock,
         switchAdminDesk, saveAdmin, previewImg } from '../ui/admin/panel.js';
import { renderTlAdminUI, addTradeLogEntry, deleteTlEntry, saveTradeLog }
  from '../ui/admin/trade-log.js';

const ACTIONS = {
  'banner:dismiss':  { on:'click', fn: () => { document.getElementById('localBanner').style.display = 'none'; } },
  'data:refresh':    { on:'click', fn: () => refreshAll() },
  'grid:scroll':     { on:'click', fn: () => scrollToGrid() },
  'premium:toggle':  { on:'click', fn: () => togglePremium() },

  'modal:open':      { on:'click', fn: (el) => openModal(el.dataset.sym) },
  'modal:close':     { on:'click', fn: () => closeModal() },
  'modal:tab':       { on:'click', fn: (el) => switchModalTab(el.dataset.tab) },
  // Backdrop: close only when the click landed on the overlay itself, never on a
  // child. Mirrors the original handleModalClick(event) exactly.
  'modal:backdrop':  { on:'click', fn: (el, ev) => { if (ev.target === el) closeModal(); } },

  'admin:show':       { on:'click',   fn: () => showAdmin() },
  'admin:close':      { on:'click',   fn: () => closeAdmin() },
  'admin:pw-submit':  { on:'click',   fn: () => checkAdminPw() },
  'admin:pw-key':     { on:'keydown', fn: (el, ev) => { if (ev.key === 'Enter') checkAdminPw(); } },
  'admin:load-stock': { on:'change',  fn: () => loadAdminStock() },
  'admin:desk':       { on:'click',   fn: (el) => switchAdminDesk(el.dataset.desk) },
  'admin:save':       { on:'click',   fn: (el) => saveAdmin(el.dataset.desk) },
  'admin:preview':    { on:'input',   fn: (el) => previewImg(el.dataset.prefix) },

  'tl:add':      { on:'click',  fn: () => addTradeLogEntry() },
  'tl:save':     { on:'click',  fn: () => saveTradeLog() },
  'tl:rerender': { on:'change', fn: () => renderTlAdminUI() },
  'tl:delete':   { on:'click',  fn: (el) => deleteTlEntry(Number(el.dataset.i)) },
};

function dispatch(ev) {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const entry = ACTIONS[el.dataset.action];
  if (!entry) { console.warn('[AlphaSeeker] unknown data-action:', el.dataset.action); return; }
  if (entry.on !== ev.type) return;
  entry.fn(el, ev);
}

export function initActions() {
  for (const type of ['click', 'change', 'input', 'keydown']) {
    document.addEventListener(type, dispatch);
  }
}

/* Exported for test/arch.mjs: every data-action used in markup must exist here. */
export const ACTION_NAMES = Object.keys(ACTIONS);
