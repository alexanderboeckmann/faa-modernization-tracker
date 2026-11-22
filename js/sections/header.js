import { $, fmt, fmtDate } from '../lib.js';
import { headlineFor } from '../model.js';

export function render({ data, snapshot, scores, cite }) {
  const count = data.snapshots.snapshots.length;
  $('asof').innerHTML = `FAA tracker data as of ${fmtDate(snapshot.asOf)} ${cite('modernskies')} · ${count} monthly snapshot${count > 1 ? 's' : ''} · refreshed monthly from modernskies.faa.gov`;

  const now = scores.yearIndex(2026);
  const telecom = headlineFor(snapshot, 'telecom');
  const radar = headlineFor(snapshot, 'radar system');
  const behind = snapshot.programs.filter(p => !p.onTrack).length;
  const obligated = data.costs.spending.find(s => s.label.startsWith('Obligated'));

  const tiles = [
    { cls: 'hero', label: 'US modernization index, 2026', value: scores.index.us[now], detail: `World class ${scores.frontierIndex[now]} · US 2007 ${scores.index.us[0]} · editorial estimate` },
    { label: 'Copper lines replaced', value: `${telecom.percent}%`, detail: `${fmt(telecom.completed)} of ${fmt(telecom.total)} ${cite('modernskies')}` },
    { label: 'New radars deployed', value: `${radar.completed} of ${fmt(radar.total)}`, detail: `${radar.percent}% · target June 2028 ${cite('dot_radar')}` },
    { label: 'Appropriated', value: '$12.5B', detail: `$${obligated.billions}B obligated by end of 2025 ${cite(obligated.src)}` },
    { label: 'Programs behind FAA plan', value: `${behind} of ${snapshot.programs.length}`, detail: `Tracker's own flag ${cite('modernskies')}` },
  ];

  $('tiles').innerHTML = tiles.map(t => `
    <div class="tile ${t.cls ?? ''}">
      <div class="l">${t.label}</div><div class="v">${t.value}</div><div class="d">${t.detail}</div>
    </div>`).join('');
}
