import { $, svg, text, chart, barPath, widthOf, fmt, fmtMonth, money, hitRow, onResize } from '../lib.js';
import { toUsd } from '../model.js';

const perUnit = (millions, units) => {
  const m = millions / units;
  if (m >= 1000) return money(m / 1000);
  return m >= 1 ? `$${m.toFixed(m < 10 ? 2 : 1)}M` : `$${Math.round(m * 1000)}K`;
};

function drawAppropriation(costs, cite) {
  const box = $('approChart');
  const lines = [...costs.appropriation.lines].sort((a, b) => b.billions - a.billions);
  const width = widthOf(box);
  const labelW = Math.min(300, width * 0.36);
  const valueW = 110;
  const unitW = 150;
  const rowH = 30;
  const top = 8;
  const pw = width - labelW - valueW - unitW;
  const max = lines[0].billions;
  const root = chart(box, width, top + lines.length * rowH, 'How the $12.5B appropriation is split');

  lines.forEach((l, i) => {
    const y = top + i * rowH;
    const unitCost = l.units ? `${perUnit(l.billions * 1000, l.units)} per ${l.per}` : '';
    text(root, 0, y + 15, l.label, 'lbl');
    svg('path', { d: barPath(labelW, y + 6, Math.max((l.billions / max) * pw, 4), 14), fill: l.derived ? 'var(--other)' : 'var(--s1)' }, root);
    text(root, labelW + (l.billions / max) * pw + 8, y + 17, `${money(l.billions)} · ${((l.billions / costs.appropriation.total) * 100).toFixed(1)}%`, 'lbl');
    if (unitCost) text(root, width, y + 17, unitCost, 'lbl2', 'end');
    hitRow(root, y, width, rowH, `<b>${l.label}</b><br>${money(l.billions)} of $${costs.appropriation.total}B
      ${l.units ? `<br>${fmt(l.units)} ${l.unit}: ${unitCost}<br><span class="m">Appropriation divided by planned units, not a contract price</span>` : ''}
      ${l.derived ? '<br><span class="m">Remainder of the $12.5B after the itemized lines</span>' : ''}`);
  });

  const srcIds = [...new Set([costs.appropriation.src, ...lines.map(l => l.src).filter(Boolean)])];
  $('approNote').innerHTML = `Per-unit figures divide the appropriation by planned units; they include installation, sites and support, not hardware alone. ${srcIds.map(cite).join(' ')}`;
}

function drawSpending(costs, cite) {
  const box = $('spendChart');
  const rows = costs.spending;
  const width = widthOf(box);
  const labelW = Math.min(260, width * 0.32);
  const rowH = 30;
  const pw = width - labelW - 90;
  const max = Math.max(...rows.map(r => r.billions));
  const root = chart(box, width, rows.length * rowH + 4, 'Money obligated, appropriated, estimated and requested');
  const inHand = r => /Obligated|Appropriated/.test(r.label);

  rows.forEach((r, i) => {
    const y = i * rowH;
    text(root, 0, y + 15, r.label, 'lbl');
    svg('path', { d: barPath(labelW, y + 6, Math.max((r.billions / max) * pw, 4), 14), fill: inHand(r) ? 'var(--s1)' : 'var(--other)' }, root);
    text(root, labelW + (r.billions / max) * pw + 8, y + 17, money(r.billions), 'lbl');
    hitRow(root, y, width, rowH, `<b>${r.label}</b><br>${money(r.billions)}<br><span class="m">${inHand(r) ? 'Money in hand' : 'Estimate or request'}</span>`);
  });
  $('spendNote').innerHTML = `Sources: ${[...new Set(rows.map(r => r.src))].map(cite).join(' ')}`;
}

function renderContracts(costs, cite) {
  const max = Math.max(...costs.contracts.map(c => c.millions));
  const meter = v => `<svg width="110" height="10" aria-hidden="true"><rect y="1" width="110" height="8" rx="4" fill="var(--track)"/><rect y="1" width="${Math.max((v / max) * 110, 3)}" height="8" rx="4" fill="var(--s1)"/></svg>`;
  const qualifier = c => (c.ceiling ? 'up to ' : c.initial ? 'initial ' : '');

  $('contractTable').innerHTML = `<table>
    <tr><th>Vendor</th><th>Program</th><th>Awarded</th><th class="n">Value</th><th></th><th class="n">Units</th><th class="n">Per unit</th><th>Notes</th></tr>
    ${costs.contracts.map(c => `<tr>
      <td>${c.vendor}</td><td>${c.program}</td><td class="nw">${fmtMonth(c.awarded)}</td>
      <td class="n nw">${qualifier(c)}${money(c.millions / 1000)} ${cite(c.src)}</td><td>${meter(c.millions)}</td>
      <td class="n">${c.units ? fmt(c.units) : ''}</td>
      <td class="n nw">${c.units ? `${c.ceiling ? '≤ ' : ''}${perUnit(c.millions, c.units)}` : ''}</td>
      <td class="m">${c.note ?? ''} ${c.noteSrc ? cite(c.noteSrc) : ''}</td></tr>`).join('')}
  </table>`;
}

function drawComparables(costs, countries, cite) {
  const box = $('compChart');
  const rows = costs.comparables.map(c => ({ ...c, usd: toUsd(c.local, c.currency, costs.fx) / 1000 }));
  const groups = [...new Set(rows.map(r => r.group))];
  const width = widthOf(box);
  const labelW = Math.min(330, width * 0.4);
  const rowH = 28;
  const headH = 24;
  const top = 22;
  const pw = width - labelW - 80;
  const [lo, hi] = [Math.log10(0.1), Math.log10(100)];
  const sx = b => labelW + ((Math.log10(b) - lo) / (hi - lo)) * pw;
  const height = top + rows.length * rowH + groups.length * headH + 8;
  const root = chart(box, width, height, 'Comparable ATC program costs, log scale');
  const name = Object.fromEntries(countries.map(c => [c.id, c.name]));

  [0.1, 1, 10, 100].forEach(b => {
    svg('line', { x1: sx(b), x2: sx(b), y1: top - 6, y2: height - 8, stroke: 'var(--grid)' }, root);
    text(root, sx(b), top - 10, b < 1 ? '$100M' : `$${b}B`, 'ax', 'middle');
  });

  let y = top;
  groups.forEach(g => {
    text(root, 0, y + 15, g, 'lbl2', 'start', { 'font-weight': 600 });
    y += headH;
    rows.filter(r => r.group === g).sort((a, b) => b.usd - a.usd).forEach(r => {
      const cy = y + rowH / 2;
      text(root, 0, cy + 4, `${name[r.country]}: ${r.item}`, 'lbl');
      svg('line', { x1: labelW, x2: sx(r.usd), y1: cy, y2: cy, stroke: 'var(--grid)', 'stroke-width': 2 }, root);
      svg('circle', { cx: sx(r.usd), cy, r: 5, fill: r.country === 'us' ? 'var(--s1)' : 'var(--s3)', stroke: 'var(--surface-1)', 'stroke-width': 2 }, root);
      text(root, sx(r.usd) + 10, cy + 4, `≈${money(r.usd)}`, 'lbl2');
      const local = r.currency === 'USD' ? '' : `<br>${r.currency} ${fmt(r.local)}M at ${costs.fx[r.currency]} USD`;
      hitRow(root, y, width, rowH, `<b>${r.item}</b><br>≈${money(r.usd)} USD${local}${r.note ? `<br><span class="m">${r.note}</span>` : ''}`);
      y += rowH;
    });
  });

  const ids = [...new Set(rows.flatMap(r => [r.src, r.noteSrc]).filter(Boolean))];
  $('compNote').innerHTML = `${costs.fx.note}. Notes: ${rows.filter(r => r.note).map(r => `${r.item}: ${r.note}`).join('; ')}. ${ids.map(cite).join(' ')}`;
}

export function render({ data, cite }) {
  const { costs } = data;
  onResize(() => {
    drawAppropriation(costs, cite);
    drawSpending(costs, cite);
    drawComparables(costs, data.scores.countries, cite);
  });
  renderContracts(costs, cite);
}
