import { $ } from '../lib.js';

export function render({ data, scores: derived, cite }) {
  const sc = data.scores;
  const now = derived.baseIndex;

  $('cards').innerHTML = sc.countries
    .map(
      c => `
    <div class="card">
      <h3>${c.name}</h3>
      <div class="m">${c.ansp} · ${c.model}</div>
      <div class="m">Index ${derived.years[0]} ${derived.index[c.id][0]} · ${derived.baseYear} ${derived.index[c.id][now]} · ${derived.years.at(-1)} projected ${derived.index[c.id].at(-1)}</div>
      <ul>${sc.evidence[c.id].map(e => `<li>${e.text} ${cite(e.src)}</li>`).join('')}</ul>
    </div>`,
    )
    .join('');
}
