/* Alpha-Seeker — toast.js
   Moved verbatim from Alpha-Seeker.html lines 2367-2376.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:var(--card2);border:1px solid var(--border2);color:var(--text);
    padding:12px 20px;border-radius:10px;font-size:13px;z-index:999;
    box-shadow:0 8px 32px rgba(0,0,0,.4);white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
