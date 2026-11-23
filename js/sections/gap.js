import { $, svg, text, chart, widthOf, hitRow, onResize } from '../lib.js';

const PHASE_ONE_END = 2028;

function markers(sc, derived) {
  return [
    { year: sc.years[0], color: 'var(--seq-2)', label: `US ${sc.years[0]}` },
    { year: derived.baseYear, color: 'var(--s1)', label: `US ${derived.baseYear}` },
    { year: PHASE_ONE_END, color: 'var(--seq-7)', label: `US ${PHASE_ONE_END} (plan)` },
  ];
}

function draw(sc, derived) {
  const marks = markers(sc, derived);
  $('gapLegend').innerHTML =
    marks.map(m => `<span><i class="key-dot" style="background:${m.color}"></i>${m.label}</span>`).join('') +
    `<span><i class="key-diamond" style="background:var(--s2)"></i>World class ${derived.baseYear}</span>`;

  const box = $('gapChart');
  const width = widthOf(box);
  const labelW = Math.min(200, width * 0.28);
  const rowH = 30;
  const top = 22;
  const pw = width - labelW - 20;
  const sx = v => labelW + (v / 5) * pw;
  const root = chart(box, width, top + sc.criteria.length * rowH + 8, 'US score vs world class by criterion');

  for (let v = 0; v <= 5; v++) {
    svg(
      'line',
      { x1: sx(v), x2: sx(v), y1: top - 6, y2: top + sc.criteria.length * rowH - 8, stroke: 'var(--grid)' },
      root,
    );
    text(root, sx(v), top - 10, v, 'ax', 'middle');
  }

  sc.criteria.forEach((k, r) => {
    const y = top + r * rowH + 8;
    const us = marks.map(m => sc.scores.us[k.id][derived.yearIndex(m.year)]);
    const best = derived.frontier[derived.baseIndex][k.id];
    const all = [...us, best];
    text(root, 0, y + 4, k.name, 'lbl');
    svg(
      'line',
      { x1: sx(Math.min(...all)), x2: sx(Math.max(...all)), y1: y, y2: y, stroke: 'var(--axis)', 'stroke-width': 2 },
      root,
    );
    svg(
      'rect',
      {
        x: sx(best) - 5,
        y: y - 5,
        width: 10,
        height: 10,
        rx: 2,
        fill: 'var(--s2)',
        stroke: 'var(--surface-1)',
        'stroke-width': 2,
        transform: `rotate(45 ${sx(best)} ${y})`,
      },
      root,
    );
    marks.forEach((m, j) =>
      svg('circle', { cx: sx(us[j]), cy: y, r: 5, fill: m.color, stroke: 'var(--surface-1)', 'stroke-width': 2 }, root),
    );
    hitRow(
      root,
      y - rowH / 2,
      width,
      rowH,
      `<b>${k.name}</b><br>${marks.map((m, j) => `${m.label}: ${us[j]}`).join(' · ')}
      <br>World class ${derived.baseYear}: ${best}<br><span class="m">Gap now ${(best - us[1]).toFixed(1)} · after phase 1 ${(best - us[2]).toFixed(1)}</span>
      <br><span class="m">A 5 means: ${k.five}</span>`,
    );
  });
}

export function render({ data, scores: derived }) {
  onResize(() => draw(data.scores, derived));
}
