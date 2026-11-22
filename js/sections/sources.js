import { $ } from '../lib.js';

export function render({ data, list }) {
  $('method').textContent = data.scores.about;
  $('srcList').innerHTML = list()
    .map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`)
    .join('');
}
