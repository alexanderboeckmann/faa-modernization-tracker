import { $ } from '../lib.js';

export function render({ data, scores: derived, cite }) {
  const sc = data.scores;
  const now = derived.yearIndex(2026);

  $('cards').innerHTML = sc.countries.map(c => `
    <div class="card">
      <h3>${c.name}</h3>
      <div class="m">${c.ansp} · ${c.model}</div>
      <div class="m">Index 2007 ${derived.index[c.id][0]} · 2026 ${derived.index[c.id][now]} · 2032 projected ${derived.index[c.id].at(-1)}</div>
      <ul>${sc.evidence[c.id].map(e => `<li>${e.text} ${cite(e.src)}</li>`).join('')}</ul>
    </div>`).join('');
}
