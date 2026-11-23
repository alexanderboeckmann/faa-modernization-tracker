const SVG_NS = 'http://www.w3.org/2000/svg';

export const MONTH_MS = 30.4375 * 864e5;

export const $ = id => document.getElementById(id);

export function svg(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
}

export function text(parent, x, y, content, cls = 'ax', anchor = 'start', attrs = {}) {
  const node = svg('text', { x, y, class: cls, 'text-anchor': anchor, ...attrs }, parent);
  node.textContent = content;
  return node;
}

export function chart(container, width, height, label) {
  container.innerHTML = '';
  return svg('svg', { width, height, role: 'img', 'aria-label': label }, container);
}

export function barPath(x, y, w, h, r = 4) {
  const body = Math.max(w - r, 0);
  return `M${x},${y} h${body} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-body} z`;
}

export const widthOf = node => Math.max(320, Math.min(node.clientWidth || 1000, 1076));

export const fmt = n => (n == null ? 'n/a' : n.toLocaleString('en-US'));
export const money = b => (b >= 1 ? `$${+b.toFixed(2)}B` : `$${Math.round(b * 1000)}M`);
export const parseDate = s => new Date(`${s.length === 7 ? `${s}-01` : s}T00:00:00Z`);
export const fmtDate = s =>
  parseDate(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
export const fmtMonth = d =>
  (typeof d === 'string' ? parseDate(d) : d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export function statusBadge(ok, yes, no) {
  const icon = ok
    ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" stroke="var(--s1)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5L11 10.5H1z" fill="var(--s2)"/></svg>';
  return `<span class="status">${icon}${ok ? yes : no}</span>`;
}

const tipNode = () => $('tip');

export const tooltip = {
  show(event, html) {
    const tip = tipNode();
    tip.innerHTML = html;
    tip.style.display = 'block';
    const { offsetWidth: w, offsetHeight: h } = tip;
    let x = event.clientX + 14;
    let y = event.clientY + 14;
    if (x + w > innerWidth - 8) x = event.clientX - w - 14;
    if (y + h > innerHeight - 8) y = event.clientY - h - 14;
    Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
  },
  hide() {
    tipNode().style.display = 'none';
  },
  bind(node, html) {
    node.addEventListener('mousemove', e => tooltip.show(e, typeof html === 'function' ? html() : html));
    node.addEventListener('mouseleave', tooltip.hide);
  },
};

export function hitRow(parent, y, width, height, html) {
  tooltip.bind(svg('rect', { x: 0, y, width, height, fill: 'transparent' }, parent), html);
}

export function createCitations(registry) {
  const order = [];
  const number = id => {
    if (!order.includes(id)) order.push(id);
    return order.indexOf(id) + 1;
  };
  const cite = id => {
    const s = registry[id];
    if (!s) return '';
    return `<a class="src" href="${s.url}" target="_blank" rel="noopener" title="${s.title.replace(/"/g, '&quot;')}">[${number(id)}]</a>`;
  };
  const list = () => {
    Object.keys(registry).forEach(number);
    return order.map(id => registry[id]);
  };
  return { cite, list };
}

export function onResize(fn) {
  let frame;
  addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fn);
  });
  fn();
}
