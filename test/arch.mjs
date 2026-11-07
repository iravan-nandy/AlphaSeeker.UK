/* Architecture guardrails. Dependency-free; run with `node test/arch.mjs`.
 *
 * These encode the boundaries the refactor was for. Without them the module
 * split decays back into the monolith one convenient import at a time. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p);
  }
})('js');

const read = f => readFileSync(f, 'utf8');
const body = f => read(f)
  .replace(/\/\*[\s\S]*?\*\//g, '')      // block comments
  .replace(/^\s*\/\/.*$/gm, '')          // line comments
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")  // single-quoted strings
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""'); // double-quoted strings
// Comments stripped but STRINGS KEPT: the inline-handler scan is looking for
// handler text that lives inside template literals, so it must not be blinded
// by the string-stripping that body() does for the purity checks.
const noComments = f => read(f)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const imports = f => [...noComments(f).matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

// 1. stats/ and strategy/ must be pure: no DOM, no network, no clock, no state.
//    This is what lets the golden test run them in Node, and what lets the data
//    workflow reuse calcATR server-side.
for (const f of files.filter(f => /^js\/(stats|strategy)\//.test(f))) {
  const b = body(f);
  for (const bad of ['document', 'window', 'localStorage', 'fetch(', 'Date.now']) {
    // earnings.js is the known exception: it still reads the store and the
    // clock. Threading nowMs through it is a follow-up; the golden test pins
    // Date.now so this does not make the lock unsound.
    if (f.endsWith('strategy/earnings.js')) continue;
    check(!b.includes(bad), `${f} must not reference ${bad} (stats/strategy are pure)`);
  }
  for (const i of imports(f)) {
    check(!/\/ui\//.test(i) && !/\/app\//.test(i),
      `${f} must not import UI or app code (found ${i})`);
  }
}

// 2. The data pipeline must not reach into the UI. It reports via the emitter.
for (const i of imports('js/app/load.js')) {
  check(!i.includes('/ui/'), `js/app/load.js must not import js/ui/** (found ${i})`);
}

// 3. modal must not import grid: that was a genuine cycle in the monolith
//    (renderCard -> openModal at 2014/2021, openModal -> renderCard at 2104).
check(!imports('js/ui/modal.js').some(i => i.includes('grid')),
  'js/ui/modal.js must not import grid.js (reintroduces the grid <-> modal cycle)');

// 4. No inline event handlers outside the two onerror attributes, which are
//    deliberate: `error` does not bubble, so delegation cannot catch them.
let inline = 0;
for (const f of [...files, 'index.html']) {
  const scan = f.endsWith('.js') ? noComments(f) : read(f);
  for (const m of scan.matchAll(/\bon[a-z]+\s*=\s*"[^"]*\(/g)) {
    if (/onerror/.test(m[0])) continue;
    fails.push(`${f}: inline handler ${m[0].trim()} — use data-action instead`);
    inline++;
  }
}

// 5. responsive.css must be the last stylesheet: this project has zero
//    !important, so every override depends on source order.
const links = [...read('index.html').matchAll(/<link[^>]+href="(css\/[^"]+)"/g)].map(m => m[1]);
check(links.at(-1) === 'css/responsive.css',
  `responsive.css must be the last stylesheet (got ${links.at(-1)})`);

// 6. No secrets.
for (const f of [...files, 'index.html', 'scripts/fetch_prices.py']) {
  check(!/api_token=['"][A-Za-z0-9.]{8,}/.test(read(f)), `${f} appears to contain an API token`);
}

// 7. Every data-action used anywhere must be registered.
const registered = new Set([...read('js/app/actions.js').matchAll(/^\s*'([a-z]+:[a-z-]+)':/gm)].map(m => m[1]));
for (const f of [...files, 'index.html']) {
  if (f.endsWith('actions.js')) continue;
  for (const m of read(f).matchAll(/data-action="([^"$]+)"/g)) {
    check(registered.has(m[1]), `${f}: data-action="${m[1]}" is not registered in js/app/actions.js`);
  }
}

if (fails.length) {
  console.error(`arch: ${fails.length} violation(s)\n` + fails.map(s => '  - ' + s).join('\n'));
  process.exit(1);
}
console.log(`arch: OK (${files.length} modules, ${links.length} stylesheets, ${registered.size} actions, ${inline} stray inline handlers)`);
