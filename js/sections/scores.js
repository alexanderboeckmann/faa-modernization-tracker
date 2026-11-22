import { $, svg, text, chart, widthOf, tooltip, onResize } from '../lib.js';

const PROJECTION_START = 2026;

function legend(name) {
  return `<span><i class="key-line" style="border-color:var(--s1)"></i>United States</span>
    <span><i class="key-line" style="border-color:var(--s3)"></i>${name}</span>
    <span><i class="key-line" style="border-color:var(--s2)"></i>World class (best peer per criterion)</span>
    <span><i class="key-line" style="border-color:var(--other)"></i>Other peers</span>
    <span><i class="key-dash" style="border-color:var(--muted)"></i>Projection</span>
    <span><i class="key-dot hollow"></i>US 2032 if the $50.1B is not funded</span>`;
}

function draw(sc, derived, pick) {
  const { years } = sc;
  const names = Object.fromEntries(sc.countries.map(c => [c.id, c.name]));
  const split = years.indexOf(PROJECTION_START);
  $('scoreLegend').innerHTML = legend(names[pick]);

  const box = $('scoreChart');
  const width = widthOf(box);
  const height = 340;
  const [L, R, T, B] = [36, 150, 14, 28];
  const pw = width - L - R;
  const ph = height - T - B;
  const sx = y => L + ((y - years[0]) / (years.at(-1) - years[0])) * pw;
  const sy = v => T + ph - ((v - 20) / 80) * ph;
  const root = chart(box, width, height, 'Modernization index by country, 2007 to 2032');

  [20, 40, 60, 80, 100].forEach(v => {
    svg('line', { x1: L, x2: L + pw, y1: sy(v), y2: sy(v), stroke: 'var(--grid)' }, root);
    text(root, L - 6, sy(v) + 4, v, 'ax', 'end');
  });
  years.forEach(y => text(root, sx(y), height - 8, y, 'ax', 'middle'));
  svg('rect', { x: sx(PROJECTION_START), y: T, width: sx(years.at(-1)) - sx(PROJECTION_START), height: ph, fill: 'var(--wash)' }, root);
  text(root, sx(PROJECTION_START) + 6, T + 12, 'Projected', 'ax');

  const line = (values, color, width = 2) => {
    const pts = values.map((v, i) => [sx(years[i]), sy(v)]);
    const path = seg => seg.map((p, i) => `${i ? 'L' : 'M'}${p}`).join(' ');
    svg('path', { d: path(pts.slice(0, split + 1)), fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, root);
    svg('path', { d: path(pts.slice(split)), fill: 'none', stroke: color, 'stroke-width': width, 'stroke-dasharray': '5 4', 'stroke-linecap': 'round' }, root);
    return pts;
  };
  const dots = (pts, color) => pts.forEach(([cx, cy]) => svg('circle', { cx, cy, r: 4, fill: color, stroke: 'var(--surface-1)', 'stroke-width': 2 }, root));

  sc.countries.filter(c => c.id !== 'us' && c.id !== pick).forEach(c => line(derived.index[c.id], 'var(--other)', 1.5));
  const featured = [
    { pts: line(derived.frontierIndex, 'var(--s2)'), color: 'var(--s2)', label: `World class ${derived.frontierIndex.at(-1)}` },
    { pts: line(derived.index[pick], 'var(--s3)'), color: 'var(--s3)', label: `${names[pick]} ${derived.index[pick].at(-1)}` },
    { pts: line(derived.index.us, 'var(--s1)', 2.5), color: 'var(--s1)', label: `United States ${derived.index.us.at(-1)}` },
  ];
  featured.forEach(f => dots(f.pts, f.color));

  const unfundedY = sy(derived.usUnfunded2032);
  svg('circle', { cx: sx(years.at(-1)), cy: unfundedY, r: 4.5, fill: 'var(--surface-1)', stroke: 'var(--s1)', 'stroke-width': 2 }, root);

  const labels = [...featured.map(f => ({ y: f.pts.at(-1)[1], text: f.label })), { y: unfundedY, text: `US unfunded ${derived.usUnfunded2032}` }]
    .sort((a, b) => a.y - b.y);
  labels.forEach((l, i) => {
    if (i && l.y - labels[i - 1].y < 15) l.y = labels[i - 1].y + 15;
    text(root, L + pw + 12, l.y + 4, l.text, 'lbl');
  });

  const cross = svg('line', { y1: T, y2: T + ph, stroke: 'var(--axis)', visibility: 'hidden' }, root);
  const hit = svg('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, root);
  hit.addEventListener('mousemove', e => {
    const mx = e.clientX - root.getBoundingClientRect().left;
    const i = years.reduce((best, y, k) => (Math.abs(sx(y) - mx) < Math.abs(sx(years[best]) - mx) ? k : best), 0);
    cross.setAttribute('x1', sx(years[i]));
    cross.setAttribute('x2', sx(years[i]));
    cross.setAttribute('visibility', 'visible');
    const rows = sc.countries
      .map(c => ({ ...c, v: derived.index[c.id][i], bold: c.id === 'us' || c.id === pick }))
      .sort((a, b) => b.v - a.v)
      .map(c => (c.bold ? `<b>${c.name}: ${c.v}</b>` : `${c.name}: ${c.v}`));
    const unfunded = i === years.length - 1 ? `<br><span class="m">US if unfunded: ${derived.usUnfunded2032}</span>` : '';
    tooltip.show(e, `<b>${years[i]}${years[i] > PROJECTION_START ? ' (projected)' : ''}</b><br>World class: ${derived.frontierIndex[i]}<br>${rows.join('<br>')}${unfunded}`);
  });
  hit.addEventListener('mouseleave', () => {
    cross.setAttribute('visibility', 'hidden');
    tooltip.hide();
  });
}

export function render({ data, scores: derived }) {
  const sc = data.scores;
  let pick = 'sg';
  const chips = $('countryChips');

  sc.countries.filter(c => c.id !== 'us').forEach(c => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.textContent = `Compare: ${c.name}`;
    button.setAttribute('aria-pressed', c.id === pick);
    button.onclick = () => {
      pick = c.id;
      [...chips.children].forEach(b => b.setAttribute('aria-pressed', b === button));
      draw(sc, derived, pick);
    };
    chips.appendChild(button);
  });
  onResize(() => draw(sc, derived, pick));

  const cells = values => values.map(v => `<td class="n">${v}</td>`).join('');
  $('scoreTable').innerHTML = `<table>
    <tr><th>Country</th>${sc.years.map(y => `<th class="n">${y}${y > PROJECTION_START ? '*' : ''}</th>`).join('')}</tr>
    ${sc.countries.map(c => `<tr><td>${c.name}</td>${cells(derived.index[c.id])}</tr>`).join('')}
    <tr><td>World class</td>${cells(derived.frontierIndex)}</tr>
  </table>
  <p class="note">* Projected. US 2032 if the $50.1B request is not funded: ${derived.usUnfunded2032}.</p>`;
}
