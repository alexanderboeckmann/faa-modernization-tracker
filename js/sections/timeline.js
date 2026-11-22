import { $, fmtMonth } from '../lib.js';

const KINDS = {
  deploy: { label: 'Deployment', color: 'var(--s1)' },
  program: { label: 'Program', color: 'var(--text-secondary)' },
  funding: { label: 'Funding', color: 'var(--s3)' },
  failure: { label: 'Failure', color: 'var(--s2)' },
  audit: { label: 'Audit', color: 'var(--muted)' },
  rule: { label: 'Rule', color: 'var(--s1)' },
  target: { label: 'Target', color: 'var(--s1)' },
};

export function render({ data, cite }) {
  const active = new Set(Object.keys(KINDS));
  const filter = $('kindFilter');

  const draw = () => {
    let era = '';
    $('timeline').innerHTML = data.milestones.milestones
      .filter(m => active.has(m.kind))
      .map(m => {
        const heading = m.era !== era ? `<div class="tl-era">${(era = m.era)}</div>` : '';
        return `${heading}<div class="tl-item ${m.kind}" style="--dot:${KINDS[m.kind].color}">
          <span class="tl-date">${fmtMonth(m.date)}</span>
          <span>${m.text}<span class="tl-kind">${KINDS[m.kind].label}</span> ${cite(m.src)}</span></div>`;
      })
      .join('');
  };

  Object.entries(KINDS).forEach(([kind, { label, color }]) => {
    const button = document.createElement('button');
    button.className = 'chip';
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = `<span class="sw round" style="background:${color}"></span>${label}`;
    button.onclick = () => {
      active.has(kind) ? active.delete(kind) : active.add(kind);
      button.setAttribute('aria-pressed', active.has(kind));
      draw();
    };
    filter.appendChild(button);
  });
  draw();
}
