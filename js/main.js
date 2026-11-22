import { createCitations } from './lib.js';
import { deriveScores, latestSnapshot } from './model.js';
import * as header from './sections/header.js';
import * as status from './sections/status.js';
import * as pace from './sections/pace.js';
import * as progress from './sections/progress.js';
import * as schedule from './sections/schedule.js';
import * as money from './sections/money.js';
import * as age from './sections/age.js';
import * as timeline from './sections/timeline.js';
import * as scores from './sections/scores.js';
import * as criteria from './sections/criteria.js';
import * as gap from './sections/gap.js';
import * as countries from './sections/countries.js';
import * as sources from './sections/sources.js';

const FILES = {
  snapshots: 'faa_snapshots',
  history: 'faa_history',
  schedule: 'schedule',
  costs: 'costs',
  milestones: 'milestones',
  age: 'system_age',
  scores: 'scores',
  sources: 'sources',
};

const SECTIONS = [header, status, pace, progress, schedule, money, age, timeline, scores, criteria, gap, countries, sources];

async function load() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
    const res = await fetch(`data/${file}.json`);
    if (!res.ok) throw new Error(`data/${file}.json: ${res.status}`);
    return [key, await res.json()];
  }));
  return Object.fromEntries(entries);
}

async function main() {
  const data = await load();
  const ctx = {
    data,
    snapshot: latestSnapshot(data.snapshots),
    scores: deriveScores(data.scores),
    deadlines: Object.fromEntries(data.schedule.programs.map(p => [p.program, p])),
    ...createCitations(data.sources),
  };
  SECTIONS.forEach(section => section.render(ctx));
}

main().catch(err => {
  document.querySelector('.wrap').insertAdjacentHTML('beforeend', `
    <section><h2>Could not load data</h2>
    <p class="sub">${err.message}. Serve the folder over HTTP (GitHub Pages or <code>python -m http.server</code>).</p></section>`);
});
