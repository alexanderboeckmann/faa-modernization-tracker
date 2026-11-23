import { $, svg, text, chart, widthOf, fmtDate, parseDate, hitRow, onResize, MONTH_MS } from '../lib.js';

const yearOf = s => parseDate(s).getUTCFullYear();

function domain(rows) {
  const first = Math.min(...rows.map(r => yearOf(r.new)));
  const last = Math.max(...rows.flatMap(r => [r.new, r.old].filter(Boolean)).map(yearOf)) + 1;
  return { first, last, x0: parseDate(`${first}-01-01`), x1: parseDate(`${last}-01-01`) };
}

function draw(rows) {
  const { first, last, x0, x1 } = domain(rows);
  const box = $('schedChart');
  const width = widthOf(box);
  const labelW = Math.min(230, width * 0.3);
  const rowH = 26;
  const top = 24;
  const pw = width - labelW - 24;
  const sx = d => labelW + ((d - x0) / (x1 - x0)) * pw;
  const root = chart(box, width, top + rows.length * rowH + 6, 'Pre-BNATCS vs BNATCS completion dates');

  for (let y = first; y <= last; y += 2) {
    const x = sx(parseDate(`${y}-01-01`));
    svg('line', { x1: x, x2: x, y1: top - 6, y2: top + rows.length * rowH - 8, stroke: 'var(--grid)' }, root);
    text(root, x, top - 10, y, 'ax', 'middle');
  }

  rows.forEach((p, i) => {
    const y = top + i * rowH + 8;
    const xNew = sx(parseDate(p.new));
    text(root, 0, y + 4, p.name, 'lbl');
    if (p.old) {
      const xOld = sx(parseDate(p.old));
      svg('line', { x1: xNew, x2: xOld, y1: y, y2: y, stroke: 'var(--axis)', 'stroke-width': 2 }, root);
      svg(
        'circle',
        { cx: xOld, cy: y, r: 5, fill: 'var(--other)', stroke: 'var(--surface-1)', 'stroke-width': 2 },
        root,
      );
    } else {
      text(root, xNew + 10, y + 4, 'new program', 'lbl2');
    }
    svg('circle', { cx: xNew, cy: y, r: 5, fill: 'var(--s1)', stroke: 'var(--surface-1)', 'stroke-width': 2 }, root);

    const moved = p.old && Math.round((parseDate(p.old) - parseDate(p.new)) / MONTH_MS);
    hitRow(
      root,
      y - rowH / 2,
      width,
      rowH,
      `<b>${p.name}</b><br>BNATCS: ${fmtDate(p.new)}
      ${p.old ? `<br>Before: ${fmtDate(p.old)}<br><span class="m">${moved} months earlier</span>` : '<br><span class="m">No prior effort</span>'}
      ${p.note ? `<br><span class="m">${p.note}</span>` : ''}`,
    );
  });
}

export function render({ data, cite }) {
  const rows = [...data.schedule.programs].sort((a, b) => parseDate(a.new) - parseDate(b.new));
  onResize(() => draw(rows));
  $('schedNote').innerHTML = `Dates as of ${data.schedule.asOf} ${cite(data.schedule.src)}`;
}
