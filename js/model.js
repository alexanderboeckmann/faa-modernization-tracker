import { MONTH_MS, parseDate } from './lib.js';

const sum = values => values.reduce((a, b) => a + b, 0);
const toIndex = values => Math.round(sum(values) * 20) / 10;

export function deriveScores(sc) {
  const ids = sc.criteria.map(c => c.id);
  const at = (country, i) => ids.map(k => sc.scores[country][k][i]);
  const years = sc.years.map((_, i) => i);

  const index = Object.fromEntries(Object.keys(sc.scores).map(c => [c, years.map(i => toIndex(at(c, i)))]));
  const frontier = years.map(i => Object.fromEntries(ids.map(k => [k, Math.max(...Object.keys(sc.scores).map(c => sc.scores[c][k][i]))])));

  return {
    index,
    frontier,
    frontierIndex: frontier.map(f => toIndex(Object.values(f))),
    usUnfunded2032: toIndex(Object.values(sc.us2032Unfunded)),
    yearIndex: year => sc.years.indexOf(year),
  };
}

export function pace(program, deadline, asOf) {
  const monthsLeft = Math.max((parseDate(deadline) - parseDate(asOf)) / MONTH_MS, 0.5);
  const remaining = program.totalPlanned - program.completed;
  const required = remaining / monthsLeft;
  const actual = program.monthComplete;
  const finish = actual > 0 ? new Date(parseDate(asOf).getTime() + (remaining / actual) * MONTH_MS) : null;
  return { remaining, required, actual, finish, onPace: actual >= required };
}

export function latestSnapshot(snapshots) {
  return snapshots.snapshots.at(-1);
}

export function headlineFor(snapshot, key) {
  return snapshot.headline.find(h => h.project.toLowerCase().includes(key));
}

export const toUsd = (amount, currency, fx) => amount * fx[currency];
