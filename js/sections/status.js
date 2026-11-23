import { $, svg, text, chart, barPath, widthOf, fmt, statusBadge, hitRow, onResize } from '../lib.js';

const share = p => p.completed / p.totalPlanned;
const ahead = p => p.completed >= p.targetAsOfDate;
const signed = n => `${n >= 0 ? '+' : ''}${fmt(n)}`;
const badge = p => statusBadge(ahead(p), p.completed > p.targetAsOfDate ? 'Ahead of plan' : 'On plan', 'Behind plan');

function draw(programs) {
  const box = $('statusChart');
  const width = widthOf(box);
  const labelW = Math.min(250, width * 0.32);
  const statusW = 118;
  const pctW = 64;
  const rowH = 34;
  const top = 22;
  const plotW = width - labelW - statusW - pctW;
  const root = chart(box, width, top + programs.length * rowH + 8, 'Phase 1 progress by program');
  const sx = f => labelW + f * plotW;

  [0, 25, 50, 75, 100].forEach(p => {
    svg(
      'line',
      { x1: sx(p / 100), x2: sx(p / 100), y1: top - 6, y2: top + programs.length * rowH - 6, stroke: 'var(--grid)' },
      root,
    );
    text(root, sx(p / 100), top - 10, `${p}%`, 'ax', 'middle');
  });

  programs.forEach((p, i) => {
    const y = top + i * rowH;
    text(root, 0, y + 12, p.name, 'lbl');
    text(root, 0, y + 25, `${fmt(p.completed)} of ${fmt(p.totalPlanned)} ${p.unitName.toLowerCase()}`, 'lbl2');
    svg('rect', { x: labelW, y: y + 4, width: plotW, height: 14, rx: 4, fill: 'var(--track)' }, root);
    svg('path', { d: barPath(labelW, y + 4, Math.max(share(p) * plotW, 4), 14), fill: 'var(--s1)' }, root);
    if (p.targetAsOfDate > 0) {
      svg(
        'rect',
        { x: sx(p.targetAsOfDate / p.totalPlanned) - 1, y, width: 2, height: 22, fill: 'var(--text-primary)' },
        root,
      );
    }
    text(root, labelW + plotW + 8, y + 16, `${Math.round(share(p) * 100)}%`, 'lbl');
    const status = svg(
      'foreignObject',
      { x: labelW + plotW + pctW - 14, y: y + 3, width: statusW + 14, height: 20 },
      root,
    );
    status.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml">${badge(p)}</div>`;

    hitRow(
      root,
      y,
      width,
      rowH,
      `<b>${p.name}</b><br>${fmt(p.completed)} of ${fmt(p.totalPlanned)} (${Math.round(share(p) * 100)}%)
      <br><span class="m">FAA plan to date ${fmt(p.targetAsOfDate)} · ${signed(p.completed - p.targetAsOfDate)} vs plan</span>
      <br><span class="m">Last month ${p.monthComplete} done vs ${p.monthPlan} planned</span>`,
    );
  });
}

export function render({ snapshot }) {
  const programs = [...snapshot.programs].sort((a, b) => share(b) - share(a));
  onResize(() => draw(programs));

  $('statusTable').innerHTML = `<table>
    <tr><th>Program</th><th>Category</th><th class="n">Completed</th><th class="n">Plan to date</th><th class="n">vs plan</th><th class="n">Total</th><th class="n">%</th><th>Status</th></tr>
    ${programs
      .map(
        p => `<tr><td>${p.name}</td><td>${p.category}</td><td class="n">${fmt(p.completed)}</td><td class="n">${fmt(p.targetAsOfDate)}</td>
      <td class="n">${signed(p.completed - p.targetAsOfDate)}</td><td class="n">${fmt(p.totalPlanned)}</td><td class="n">${Math.round(share(p) * 100)}</td><td>${badge(p)}</td></tr>`,
      )
      .join('')}
  </table>`;
}
