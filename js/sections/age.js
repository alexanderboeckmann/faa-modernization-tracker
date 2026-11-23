import { $, svg, text, chart, widthOf, hitRow, onResize } from '../lib.js';

const MAX_AGE = 75;

function draw(items, asOfYear) {
  const box = $('ageChart');
  const width = widthOf(box);
  const labelW = Math.min(250, width * 0.32);
  const rowH = 36;
  const top = 22;
  const pw = width - labelW - 24;
  const sx = a => labelW + (a / MAX_AGE) * pw;
  const root = chart(box, width, top + items.length * rowH + 22, 'Age of FAA facilities and systems');

  for (let a = 0; a <= 70; a += 10) {
    svg('line', { x1: sx(a), x2: sx(a), y1: top - 6, y2: top + items.length * rowH - 6, stroke: 'var(--grid)' }, root);
    text(root, sx(a), top - 10, a, 'ax', 'middle');
  }
  text(root, labelW + pw, top + items.length * rowH + 12, 'years in service', 'ax', 'end');

  items.forEach((r, i) => {
    const y = top + i * rowH;
    const range = r.age_low === r.age_high ? `${r.age_low}` : `${r.age_low} to ${r.age_high}`;
    text(root, 0, y + 12, r.name, 'lbl');
    text(root, 0, y + 25, r.group, 'lbl2');
    svg('rect', { x: labelW, y: y + 5, width: pw, height: 12, rx: 4, fill: 'var(--track)' }, root);
    svg(
      'rect',
      { x: labelW, y: y + 5, width: sx(r.age_low) - labelW, height: 12, rx: 4, fill: 'var(--s2)', opacity: 0.55 },
      root,
    );
    svg(
      'rect',
      {
        x: sx(r.age_low),
        y: y + 5,
        width: Math.max(sx(r.age_high) - sx(r.age_low), 3),
        height: 12,
        rx: 4,
        fill: 'var(--s2)',
      },
      root,
    );
    if (r.design_life)
      svg('rect', { x: sx(r.design_life) - 1, y: y + 1, width: 2, height: 20, fill: 'var(--text-primary)' }, root);
    svg(
      'circle',
      { cx: sx(r.after_2028_age), cy: y + 11, r: 5, fill: 'var(--s1)', stroke: 'var(--surface-1)', 'stroke-width': 2 },
      root,
    );
    hitRow(
      root,
      y,
      width,
      rowH,
      `<b>${r.name}</b><br>Age in ${asOfYear}: ${range} years
      ${r.design_life ? `<br>Design life: ${r.design_life} years` : ''}
      <br>End of 2028: ${r.after_2028}<br><span class="m">${r.note}</span>`,
    );
  });
}

export function render({ data, cite }) {
  const { age, scores } = data;
  const items = [...age.items].sort((a, b) => b.age_high - a.age_high);
  onResize(() => draw(items, age.asOfYear));

  const barSources = [...new Set(items.map(r => r.src))].map(cite).join(' ');
  $('ageFacts').innerHTML =
    age.facts.map(f => `<li>${f.text} ${cite(f.src)}</li>`).join('') + `<li>Bar sources: ${barSources}</li>`;

  const names = Object.fromEntries(scores.countries.map(c => [c.id, c.name]));
  $('coreAuto').innerHTML = `<table>
    <tr><th>Country</th><th>System</th><th class="n">In service since</th><th class="n">Age ${age.asOfYear}</th><th>Replacement</th></tr>
    ${age.core_automation
      .map(
        c => `<tr><td>${names[c.country]}</td><td>${c.system} ${cite(c.src)}</td>
      <td class="n">${c.since ?? 'n/a'}</td><td class="n">${c.since ? age.asOfYear - c.since : 'n/a'}</td>
      <td>${c.replace ? `Due ${c.replace}` : 'None scheduled'}</td></tr>`,
      )
      .join('')}
  </table>`;
}
