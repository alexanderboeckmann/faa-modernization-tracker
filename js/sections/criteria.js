import { $, svg, text, chart, widthOf, tooltip, onResize } from '../lib.js';

const step = v => Math.min(7, Math.round((v / 5) * 7));

function draw(sc, derived) {
  const i = +$('yearSlider').value;
  const year = sc.years[i];
  $('yearVal').textContent = `${year}${year > derived.baseYear ? ' (projected)' : ''}`;

  const columns = [...sc.countries, { id: 'frontier', name: 'World class' }];
  const valueOf = (col, k) => (col.id === 'frontier' ? derived.frontier[i][k] : sc.scores[col.id][k][i]);
  const indexOf = col => (col.id === 'frontier' ? derived.frontierIndex[i] : derived.index[col.id][i]);

  const box = $('heatChart');
  const width = widthOf(box);
  const labelW = Math.min(190, width * 0.24);
  const cw = Math.max(52, (width - labelW) / columns.length);
  const ch = 30;
  const top = 40;
  const root = chart(
    box,
    labelW + cw * columns.length,
    top + sc.criteria.length * ch + 34,
    `Scores by criterion and country, ${year}`,
  );
  const cx = j => labelW + j * cw + cw / 2;

  columns.forEach((col, j) => {
    const label = text(root, cx(j), top - 10, col.name, 'lbl2', 'middle');
    if (cw < 80) {
      label.setAttribute('transform', `rotate(-25 ${cx(j)} ${top - 10})`);
      label.setAttribute('text-anchor', 'start');
    }
  });

  sc.criteria.forEach((k, r) => {
    const y = top + r * ch;
    text(root, 0, y + ch / 2 + 4, k.name, 'lbl');
    columns.forEach((col, j) => {
      const v = valueOf(col, k.id);
      const cell = svg(
        'rect',
        { x: labelW + j * cw + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 4, fill: `var(--seq-${step(v)})` },
        root,
      );
      text(root, cx(j), y + ch / 2 + 4, v.toFixed(1), 'lbl num', 'middle', {
        fill: step(v) >= 4 ? '#ffffff' : 'var(--text-primary)',
      });
      tooltip.bind(
        cell,
        `<b>${col.name} · ${k.name} · ${year}</b><br>${v.toFixed(1)} of 5
        ${col.id === 'frontier' ? '<br><span class="m">Best of the seven that year</span>' : ''}
        <br><span class="m">A 5 means: ${k.five}</span>`,
      );
    });
  });

  const totalY = top + sc.criteria.length * ch + 20;
  text(root, 0, totalY, 'Index (0 to 100)', 'lbl');
  columns.forEach((col, j) => text(root, cx(j), totalY, indexOf(col), 'lbl', 'middle', { 'font-weight': 600 }));
}

export function render({ data, scores: derived }) {
  const slider = $('yearSlider');
  slider.max = data.scores.years.length - 1;
  slider.value = derived.baseIndex;
  slider.oninput = () => draw(data.scores, derived);
  onResize(() => draw(data.scores, derived));
}
