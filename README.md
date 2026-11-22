# FAA modernization tracker

A static dashboard tracking the FAA's Brand New Air Traffic Control System (BNATCS)
against its own plan: program progress and pace, where the money goes, the age of
what it replaces, the NextGen years before it, and a scorecard against six peer air
navigation systems from 2007 through projected 2032.

Serve the folder over HTTP to view it locally (`python -m http.server`). GitHub Pages
serves it as-is.

## Layout

```
index.html                 markup
styles.css
js/main.js                 loads data, renders sections
js/lib.js                  DOM, SVG, formatting, tooltip, citations
js/model.js                derived values: index, frontier, pace
js/sections/*.js           one module per page section
data/*.json                all content
scripts/update_faa.py      monthly tracker snapshot
scripts/validate_data.py   data checks
tests/fixture_bundle.js    saved tracker bundle for offline parser tests
```

## Data

| File | Contents | Maintained |
|---|---|---|
| `faa_snapshots.json` | Monthly snapshots of modernskies.faa.gov: 12 programs with completed, plan to date, total and last month's actual vs plan, plus headline tiles | Automatically, monthly |
| `faa_history.json` | Dated progress points from FAA and DOT statements before snapshots began | By hand |
| `schedule.json` | Pre-BNATCS vs BNATCS completion dates per program (GAO) | By hand |
| `costs.json` | Appropriation line items, spending, contract awards, international comparables | By hand |
| `milestones.json` | 2007 to 2037 timeline | By hand |
| `system_age.json` | Facility and system ages vs design life | By hand |
| `scores.json` | 7 countries x 10 criteria x 8 years, with evidence | By hand |
| `sources.json` | Every source id referenced above | By hand |

Run `python scripts/validate_data.py` after editing. It checks score ranges, that
appropriation lines sum to the total, that every tracker program has a deadline, and
that every `src` resolves.

Scores are editorial estimates, not official ratings. Each criterion has a written
definition of a 5 (`criteria[].five`).

## Monthly updates

`.github/workflows/monthly-update.yml` runs on the 17th of each month and on demand.
`update_faa.py` finds the tracker's JS bundle, parses the program array, headline tiles
and as-of date, and appends a snapshot when anything changed. The site sits behind bot
protection, so the script falls back to headless Chromium. If both fail, the workflow
opens an issue.

```
python scripts/update_faa.py --bundle tests/fixture_bundle.js --dry-run
```
