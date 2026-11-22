import { $, svg, text, chart, widthOf, hitRow, onResize } from '../lib.js';

const MARKERS = [
  { year: 2007, color: 'var(--seq-2)' },
  { year: 2026, color: 'var(--s1)' },
  { year: 2028, color: 'var(--seq-7)' },
];

function draw(sc, derived) {
  const box = $('gapChart');
  const width = widthOf(box);
  const labelW = Math.min(200, width * 0.28);
  const rowH = 30;
  const top = 22;
  const pw = width - labelW - 20;
  const sx = v => labelW + (v / 5) * pw;
  const now = derived.yearIndex(2026);
  const root = chart(box, width, top + sc.criteria.length * rowH + 8, 'US score vs world class by criterion');

  for (let v = 0; v <= 5; v++) {
    svg('line', { x1: sx(v), x2: sx(v), y1: top - 6, y2: top + sc.criteria.length * rowH - 8, stroke: 'var(--grid)' }, root);
    text(root, sx(v), top - 10, v, 'ax', 'middle');
  }

  sc.criteria.forEach((k, r) => {
    const y = top + r * rowH + 8;
    const us = MARKERS.map(m => sc.scores.us[k.id][derived.yearIndex(m.year)]);
    const best = derived.frontier[now][k.id];
    const all = [...us, best];
    text(root, 0, y + 4, k.name, 'lbl');
    svg('line', { x1: sx(Math.min(...all)), x2: sx(Math.max(...all)), y1: y, y2: y, stroke: 'var(--axis)', 'stroke-width': 2 }, root);
    svg('rect', { x: sx(best) - 5, y: y - 5, width: 10, height: 10, rx: 2, fill: 'var(--s2)', stroke: 'var(--surface-1)', 'stroke-width': 2, transform: `rotate(45 ${sx(best)} ${y})` }, root);
    MARKERS.forEach((m, j) => svg('circle', { cx: sx(us[j]), cy: y, r: 5, fill: m.color, stroke: 'var(--surface-1)', 'stroke-width': 2 }, root));
    hitRow(root, y - rowH / 2, width, rowH, `<b>${k.name}</b><br>US 2007 ${us[0]} · 2026 ${us[1]} · 2028 plan ${us[2]}
      <br>World class 2026: ${best}<br><span class="m">Gap now ${(best - us[1]).toFixed(1)} · after phase 1 ${(best - us[2]).toFixed(1)}</span>
      <br><span class="m">A 5 means: ${k.five}</span>`);
  });
}

export function render({ data, scores: derived }) {
  onResize(() => draw(data.scores, derived));
}
