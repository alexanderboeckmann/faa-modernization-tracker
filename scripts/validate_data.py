#!/usr/bin/env python3
"""Checks data/*.json: shape, ranges, dates, ordering and source references."""

import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
DATE = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")


def load(name):
    return json.loads((DATA / f"{name}.json").read_text())


def walk(node, key=None):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, k)
    elif isinstance(node, list):
        for item in node:
            yield from walk(item, key)
    else:
        yield key, node


def check_scores(sc):
    criteria = {c["id"] for c in sc["criteria"]}
    assert sc["baseYear"] in sc["years"], "baseYear not in years"
    for country, table in sc["scores"].items():
        assert set(table) == criteria, f"{country}: criteria mismatch"
        for crit, values in table.items():
            assert len(values) == len(sc["years"]), f"{country}.{crit}: wrong length"
            assert all(0 <= v <= 5 for v in values), f"{country}.{crit}: out of range"
    assert set(sc["us2032Unfunded"]) == criteria, "us2032Unfunded: criteria mismatch"
    assert set(sc["evidence"]) == set(sc["scores"]), "evidence: country mismatch"


def check_history(history):
    for s in history["series"]:
        dates = [p["date"] for p in s["points"]]
        assert dates == sorted(dates), f"{s['id']}: points out of order"
        values = [p["value"] for p in s["points"]]
        drops = [(a, b) for a, b in zip(values, values[1:], strict=False) if b < a]
        assert not drops, f"{s['id']}: value decreases {drops}"
        assert all(v <= s["total"] for v in values), f"{s['id']}: value above total"


def check_schedule(schedule, snapshots):
    programs = {p["program"] for p in schedule["programs"]}
    missing = {p["id"] for p in snapshots["snapshots"][-1]["programs"]} - programs
    assert not missing, f"schedule missing deadlines for {sorted(missing)}"


def check_costs(costs):
    lines = sum(line["billions"] for line in costs["appropriation"]["lines"])
    assert abs(lines - costs["appropriation"]["total"]) < 0.01, f"appropriation lines sum to {lines}"
    missing = {c["currency"] for c in costs["comparables"]} - set(costs["fx"])
    assert not missing, f"missing fx rates {missing}"


def main():
    data = {p.stem: load(p.stem) for p in DATA.glob("*.json")}
    sources = data.pop("sources")

    check_scores(data["scores"])
    check_history(data["faa_history"])
    check_schedule(data["schedule"], data["faa_snapshots"])
    check_costs(data["costs"])

    fields = [(k, v) for d in data.values() for k, v in walk(d)]
    bad_dates = [v for k, v in fields if k in ("date", "awarded", "new", "old") and v and not DATE.match(v)]
    assert not bad_dates, f"malformed dates {bad_dates}"

    cited = {v for k, v in fields if k in ("src", "noteSrc")}
    assert not cited - set(sources), f"unknown source ids {sorted(cited - set(sources))}"
    assert not set(sources) - cited, f"unused source ids {sorted(set(sources) - cited)}"
    print(f"ok: {len(data) + 1} files, {len(sources)} sources")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        sys.exit(f"invalid data: {e}")
