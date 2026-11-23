import { $, svg, text, fmt, fmtDate, fmtMonth, parseDate, tooltip } from '../lib.js';

const HEADLINE_KEYS = {
  'tdm-to-ip': 'telecom',
  radio: 'radio site',
  'voice-switch': 'voice switch',
  sai: 'surface awareness',
  tfdm: 'electronic flight strip',
  radar: 'new radar',
  tss: 'tower simulation',
  'e-ids': 'enterprise information',
  smr: 'surface movement',
};

const X0 = parseDate('2024-07-01');
const X1 = parseDate('2029-01-31');

const yearTicks = () =>
  Array.from({ length: X1.getUTCFullYear() - X0.getUTCFullYear() }, (_, i) => X0.getUTCFullYear() + 1 + i);

function buildSeries(history, snapshots, latest) {
  const series = Object.entries(HEADLINE_KEYS).map(([program, key]) => {
    const h = history.series.find(s => s.program === program);
    const tile = latest.headline.find(t => t.project.toLowerCase().includes(key));
    const total = h?.total ?? tile?.total;
    const toPct = v => (h?.unit.startsWith('%') ? v : (v / total) * 100);
    return {
      program,
      key,
      label: h?.label ?? tile.label.replace(/^Of [\d,]+ /, ''),
      percentUnit: h?.unit.startsWith('%'),
      unit: h?.unit ?? `of ${fmt(total)}`,
      points: (h?.points ?? []).map(p => ({ ...p, d: parseDate(p.date), pct: toPct(p.value) })),
    };
  });

  snapshots.forEach(snap =>
    series.forEach(s => {
      const tile = snap.headline.find(t => t.project.toLowerCase().includes(s.key));
      if (!tile?.total || s.points.some(p => p.date === snap.asOf)) return;
      s.points.push({
        date: snap.asOf,
        d: parseDate(snap.asOf),
        value: tile.completed,
        pct: (tile.completed / tile.total) * 100,
        src: 'modernskies',
      });
    }),
  );
  series.forEach(s => s.points.sort((a, b) => a.d - b.d));
  return series;
}

function drawPanel(container, s, start, deadline, sources) {
  const begin = parseDate(start);
  const end = parseDate(deadline);
  const last = s.points.at(-1);
  container.innerHTML = `<h3>${s.label}</h3><div class="m">${last ? `${Math.round(last.pct)}% as of ${fmtDate(last.date)}` : ''} · deadline ${fmtMonth(end)}</div>`;

  const width = Math.max(240, container.clientWidth || 250);
  const height = 150;
  const [L, R, T, B] = [40, 10, 12, 22];
  const pw = width - L - R;
  const ph = height - T - B;
  const sx = d => L + ((Math.min(Math.max(d, X0), X1) - X0) / (X1 - X0)) * pw;
  const sy = v => T + ph - (v / 100) * ph;
  const root = svg('svg', { width, height, role: 'img', 'aria-label': `${s.label} over time` }, container);

  [0, 50, 100].forEach(v => {
    svg('line', { x1: L, x2: L + pw, y1: sy(v), y2: sy(v), stroke: 'var(--grid)' }, root);
    text(root, L - 4, sy(v) + 4, `${v}%`, 'ax', 'end');
  });
  yearTicks().forEach(y => {
    const x = sx(parseDate(`${y}-01-01`));
    svg('line', { x1: x, x2: x, y1: T, y2: T + ph, stroke: 'var(--grid)' }, root);
    text(root, x, height - 6, y, 'ax', 'middle');
  });

  svg(
    'line',
    {
      x1: sx(begin),
      y1: sy(0),
      x2: sx(end),
      y2: sy(100),
      stroke: 'var(--muted)',
      'stroke-width': 1.5,
      'stroke-dasharray': '4 3',
    },
    root,
  );

  if (s.points.length) {
    if (s.points.length > 1) {
      const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.d)},${sy(p.pct)}`).join(' ');
      svg(
        'path',
        {
          d,
          fill: 'none',
          stroke: 'var(--s1)',
          'stroke-width': 2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        },
        root,
      );
    }
    s.points.forEach(p => {
      svg(
        'circle',
        {
          cx: sx(p.d),
          cy: sy(p.pct),
          r: 4,
          fill: p.approx ? 'var(--surface-1)' : 'var(--s1)',
          stroke: p.approx ? 'var(--s1)' : 'var(--surface-1)',
          'stroke-width': 2,
        },
        root,
      );
      const hit = svg('circle', { cx: sx(p.d), cy: sy(p.pct), r: 10, fill: 'transparent' }, root);
      tooltip.bind(
        hit,
        `<b>${fmtDate(p.date)}</b><br>${fmt(p.value)}${s.percentUnit ? '%' : ` ${s.unit}`} (${Math.round(p.pct)}%)
        ${p.approx ? '<br><span class="m">Rounded or "more than" figure</span>' : ''}
        ${p.note ? `<br><span class="m">${p.note}</span>` : ''}
        <br><span class="m">${sources[p.src]?.title ?? ''}</span>`,
      );
    });
  }
  svg(
    'circle',
    { cx: sx(end), cy: sy(100), r: 4, fill: 'var(--s2)', stroke: 'var(--surface-1)', 'stroke-width': 2 },
    root,
  );
}

export function render({ data, snapshot, deadlines, cite }) {
  const box = $('multiples');
  buildSeries(data.history, data.snapshots.snapshots, snapshot).forEach(s => {
    const panel = document.createElement('div');
    panel.className = 'mult';
    box.appendChild(panel);
    drawPanel(panel, s, data.schedule.programStart, deadlines[s.program].new, data.sources);
  });

  const notes = data.history.notes.map(n => `${n.text} ${cite(n.src)}`).join(' ');
  $('histNotes').innerHTML = `Hollow points are rounded or "more than" figures. ${notes}`;
}
