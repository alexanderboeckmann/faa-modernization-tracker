import { $, fmt, fmtDate, fmtMonth, statusBadge } from '../lib.js';
import { pace } from '../model.js';

const meter = (value, max, color) => `<svg width="120" height="10" aria-hidden="true">
  <rect y="1" width="120" height="8" rx="4" fill="var(--track)"/>
  <rect y="1" width="${value > 0 ? Math.max((value / max) * 120, 3) : 0}" height="8" rx="4" fill="${color}"/></svg>`;

export function render({ snapshot, deadlines, cite }) {
  const rows = snapshot.programs
    .map(p => ({ p, deadline: deadlines[p.id], ...pace(p, deadlines[p.id].new, snapshot.asOf) }))
    .sort((a, b) => a.actual / a.required - b.actual / b.required);
  const max = Math.max(...rows.flatMap(r => [r.required, r.actual]));

  $('paceTable').innerHTML = `<table>
    <tr><th>Program</th><th>Deadline</th><th class="n">Remaining</th><th class="n">Needed / month</th><th></th>
      <th class="n">Last month</th><th></th><th class="n">FAA plan last month</th><th>Finish at last month's rate</th><th>Status</th></tr>
    ${rows.map(r => `<tr>
      <td>${r.p.name}</td>
      <td class="nw">${fmtDate(r.deadline.new)}${r.deadline.assumed ? '*' : ''}</td>
      <td class="n">${fmt(r.remaining)}</td>
      <td class="n">${r.required.toFixed(1)}</td><td>${meter(r.required, max, 'var(--muted)')}</td>
      <td class="n">${fmt(r.actual)}</td><td>${meter(r.actual, max, 'var(--s1)')}</td>
      <td class="n">${fmt(r.p.monthPlan)}</td>
      <td class="nw">${r.finish ? fmtMonth(r.finish) : 'None last month'}</td>
      <td>${statusBadge(r.onPace, 'On pace', 'Behind pace')}</td></tr>`).join('')}
  </table>
  <p class="note">Deadlines from GAO-26-107992 ${cite('gao26')}. * No program-specific date published; phase 1 end assumed.</p>`;
}
