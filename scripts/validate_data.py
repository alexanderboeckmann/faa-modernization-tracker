#!/usr/bin/env python3
"""Checks data/*.json for shape, score ranges and unresolved source ids."""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def load(name):
    return json.loads((DATA / f"{name}.json").read_text())


def source_ids(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in ("src", "noteSrc") and isinstance(value, str):
                yield value
            else:
                yield from source_ids(value)
    elif isinstance(node, list):
        for item in node:
            yield from source_ids(item)


def check_scores(sc):
    criteria = {c["id"] for c in sc["criteria"]}
    for country, table in sc["scores"].items():
        assert set(table) == criteria, f"{country}: criteria mismatch"
        for crit, values in table.items():
            assert len(values) == len(sc["years"]), f"{country}.{crit}: wrong length"
            assert all(0 <= v <= 5 for v in values), f"{country}.{crit}: out of range"
    assert set(sc["us2032Unfunded"]) == criteria, "us2032Unfunded: criteria mismatch"
    assert set(sc["evidence"]) == set(sc["scores"]), "evidence: country mismatch"


def check_schedule(schedule, snapshots):
    programs = {p["program"] for p in schedule["programs"]}
    latest = {p["id"] for p in snapshots["snapshots"][-1]["programs"]}
    missing = latest - programs
    assert not missing, f"schedule missing deadlines for: {sorted(missing)}"


def check_costs(costs):
    lines = sum(line["billions"] for line in costs["appropriation"]["lines"])
    assert abs(lines - costs["appropriation"]["total"]) < 0.01, f"appropriation lines sum to {lines}"
    currencies = {c["currency"] for c in costs["comparables"]}
    assert currencies <= set(costs["fx"]), f"missing fx rates: {currencies - set(costs['fx'])}"


def main():
    names = [p.stem for p in DATA.glob("*.json")]
    data = {name: load(name) for name in names}
    sources = data.pop("sources")

    check_scores(data["scores"])
    check_schedule(data["schedule"], data["faa_snapshots"])
    check_costs(data["costs"])

    unknown = {sid for d in data.values() for sid in source_ids(d)} - set(sources)
    assert not unknown, f"unknown source ids: {sorted(unknown)}"
    print(f"ok: {len(names)} files, {len(sources)} sources")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        sys.exit(f"invalid data: {e}")
