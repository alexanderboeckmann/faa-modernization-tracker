import { $, fmt, fmtDate, money } from '../lib.js';
import { headlineFor } from '../model.js';

export function render({ data, snapshot, scores, cite }) {
  const count = data.snapshots.snapshots.length;
  $('asof').innerHTML =
    `FAA tracker data as of ${fmtDate(snapshot.asOf)} ${cite('modernskies')} · ${count} monthly snapshot${count > 1 ? 's' : ''} · refreshed monthly from modernskies.faa.gov`;

  const now = scores.baseIndex;
  const telecom = headlineFor(snapshot, 'telecom');
  const radar = headlineFor(snapshot, 'radar system');
  const behind = snapshot.programs.filter(p => p.completed < p.targetAsOfDate).length;
  const { appropriation, spending } = data.costs;
  const obligated = spending.find(s => s.label.startsWith('Obligated'));

  const tiles = [
    {
      cls: 'hero',
      label: `US modernization index, ${scores.baseYear}`,
      value: scores.index.us[now],
      detail: `World class ${scores.frontierIndex[now]} · US ${scores.years[0]} ${scores.index.us[0]} · editorial estimate`,
    },
    {
      label: 'Copper lines replaced',
      value: `${telecom.percent}%`,
      detail: `${fmt(telecom.completed)} of ${fmt(telecom.total)} ${cite('modernskies')}`,
    },
    {
      label: 'New radars deployed',
      value: `${radar.completed} of ${fmt(radar.total)}`,
      detail: `${radar.percent}% · target June 2028 ${cite('dot_radar')}`,
    },
    {
      label: 'Appropriated',
      value: money(appropriation.total),
      detail: `${money(obligated.billions)} ${obligated.label.replace(/^Obligated/, 'obligated')} ${cite(obligated.src)}`,
    },
    {
      label: 'Programs behind plan',
      value: `${behind} of ${snapshot.programs.length}`,
      detail: `Installed to date vs FAA plan to date ${cite('modernskies')}`,
    },
  ];

  $('tiles').innerHTML = tiles
    .map(
      t => `
    <div class="tile ${t.cls ?? ''}">
      <div class="l">${t.label}</div><div class="v">${t.value}</div><div class="d">${t.detail}</div>
    </div>`,
    )
    .join('');
}
