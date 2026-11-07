/* Alpha-Seeker — auth/entitlements.js
 *
 * The single seam for "who is allowed to see what".
 *
 * READ THIS BEFORE RELYING ON IT: on a purely static site there is no such
 * thing as a real access control. Everything here runs in the visitor's own
 * browser, on data their browser already downloaded, and can be flipped from
 * the console in one line. This module exists to keep that fact in ONE place
 * rather than sprinkled through the UI, and to give a later PR a single file
 * to replace.
 *
 * What it is:  a cosmetic gate, plus an admin passphrase that is hashed rather
 *              than sitting in plaintext (the monolith shipped ADMIN_PW =
 *              the passphrase in the clear at line 802).
 * What it is NOT: authentication, authorisation, or payment enforcement.
 *
 * Hashing the passphrase raises the bar from "read the source" to "read the
 * source and run a dictionary attack". That is obfuscation, not security. The
 * admin panel only edits localStorage on the visitor's own machine, so there
 * is nothing behind this gate worth stealing.
 *
 * Making premium real needs a server: a payment webhook issuing a signed token
 * this module verifies. Note that pure-static GitHub OAuth is not an option --
 * github.com/login/oauth/access_token sends no Access-Control-Allow-Origin
 * (verified 2026-09-29), so a browser cannot complete the code exchange. The
 * realistic choices are a pasted personal access token validated against
 * api.github.com (which does send CORS), or one small serverless function.
 */

import { S } from '../state/store.js';

/* SHA-256 of the admin passphrase. Override by editing this constant; there is
   deliberately no plaintext anywhere in the tree. */
const ADMIN_PW_SHA256 =
  'be30617e3909938cf0ade4e3b842397a8deebf212f14a457d761ce4481354f01';

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Resolves true when the passphrase matches. Async: SubtleCrypto is async,
 *  and it is only available on a secure context (https or localhost). */
export async function checkAdminPassphrase(pw) {
  if (!pw) return false;
  if (!globalThis.crypto?.subtle) {
    console.warn('[AlphaSeeker] SubtleCrypto unavailable (needs https or localhost).');
    return false;
  }
  return (await sha256Hex(pw)) === ADMIN_PW_SHA256;
}

export function isAdmin()   { return !!S.isAdmin; }
export function isPremium() { return !!S.isPremium || !!S.isAdmin; }

export function grantAdmin() { S.isAdmin = true; S.isPremium = true; }
export function revokeAdmin() { S.isAdmin = false; }
