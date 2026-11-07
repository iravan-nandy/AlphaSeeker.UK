/* Alpha-Seeker — format.js
   Moved verbatim from Alpha-Seeker.html lines 951-955, 957-960, 962-975, 977-992.
   COMMIT 1 IS A PURE MOVE: bodies are byte-identical; only `export`,
   `import` and this header were added. Do not reformat here. */

export function fmtPrice(p, currency) {
  if (p == null) return '—';
  const sym = currency === 'GBp' ? 'p' : (currency === 'GBP' ? '£' : '$');
  return sym + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(p) {
  if (p == null) return '—';
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

export function sigClass(label) {
  if (!label) return 'sig-NA';
  const l = label.toUpperCase();
  if (l.includes('PRECISION BUY') || l.includes('PRECISION LONG')) return 'sig-PRECISION_BUY';
  if (l.includes('MOMENTUM BUY') || l.includes('MOMENTUM LONG') || l.includes('🔥')) return 'sig-MOMENTUM_BUY';
  if (l.includes('EARNINGS')) return 'sig-APPROACHING';
  if (l.includes('SELL') || l.includes('🚨')) return 'sig-SELL';
  if (l.includes('APPROACHING') || l.includes('BUILD')) return 'sig-APPROACHING';
  if (l.includes('VOLUME SURGE')) return 'sig-VOLUME_SURGE';
  if (l.includes('EXTENDED')) return 'sig-EXTENDED';
  if (l.includes('WATCH') || l.includes('HOLD')) return 'sig-WATCH';
  if (l.includes('AVOID')) return 'sig-AVOID';
  return 'sig-NA';
}

export function sparklineSVG(closes) {
  if (!closes || closes.length < 5) return '';
  const data = closes.slice(-20).filter(c => c != null);
  if (data.length < 4) return '';
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 160, H = 36;
  const pts = data.map((c, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((c - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = data[data.length-1] >= data[0];
  const col = isUp ? '#00d97e' : '#ef4444';
  return `<svg viewBox="0 0 ${W} ${H}" class="sparkline" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
