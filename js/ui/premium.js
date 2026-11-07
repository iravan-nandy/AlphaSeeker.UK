/* Alpha-Seeker — premium.js
   Moved verbatim from Alpha-Seeker.html lines 2232-2237, 2355-2365.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

import { S } from '../state/store.js';
import { showToast } from './toast.js';

export function applyPremiumState() {
  ['precAnalystView', 'momAnalystView', 'tradeLogView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('prem-unlocked', S.isPremium || S.isAdmin);
  });
}

export function togglePremium() {
  S.isPremium = !S.isPremium;
  const btn = document.getElementById('premiumToggleBtn');
  btn.textContent = S.isPremium ? '✓ Premium Active' : 'Unlock Premium';
  btn.className   = S.isPremium ? 'btn btn-sm' : 'btn btn-primary btn-sm';
  if (S.isPremium) btn.style.background = 'var(--green)';
  else btn.style.background = '';
  applyPremiumState();
  // In production: integrate Stripe / Beehiiv payment check here
  if (S.isPremium) showToast('Premium unlocked (demo mode) — connect Stripe for real subscriptions');
}
