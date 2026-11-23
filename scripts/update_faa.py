#!/usr/bin/env python3
"""Appends a snapshot of the FAA Modern Skies tracker to data/faa_snapshots.json.

The tracker has no API; its figures are compiled into /assets/index-<hash>.js.
Exit codes: 0 new snapshot, 3 unchanged, 1 failure.
"""

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://modernskies.faa.gov/"
SNAPSHOTS = Path(__file__).resolve().parent.parent / "data" / "faa_snapshots.json"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)
PROGRAM_KEYS = {"id", "name", "completed", "totalPlanned"}
CLOSING = {"[": "]", "{": "}"}


def http_get(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", "replace")


def fetch_with_urllib():
    match = re.search(r'src="(/assets/index-[\w-]+\.js)"', http_get(SITE))
    if not match:
        raise RuntimeError("bundle <script> not found in page")
    url = SITE.rstrip("/") + match.group(1)
    return url, http_get(url)


def fetch_with_browser():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(SITE, wait_until="networkidle", timeout=90_000)
        url = page.evaluate("[...document.scripts].map(s => s.src).find(s => s.includes('/assets/index-'))")
        if not url:
            raise RuntimeError("bundle <script> not found after render")
        body = page.evaluate("u => fetch(u).then(r => r.text())", url)
        browser.close()
        return url, body


def matching_bracket(s, start):
    opener, closer = s[start], CLOSING[s[start]]
    depth, quote, i = 0, None, start
    while i < len(s):
        c = s[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError("unbalanced literal")


def js_literal(source):
    """Parses a minified JS object/array literal of plain values."""
    out, quote, i = [], None, 0
    while i < len(source):
        c = source[i]
        if quote:
            if c == "\\":
                out.append(source[i : i + 2])
                i += 2
                continue
            out.append('"' if c == quote else '\\"' if c == '"' else c)
            quote = None if c == quote else quote
        elif c in "\"'`":
            quote = c
            out.append('"')
        elif source.startswith(("!0", "!1"), i):
            out.append("true" if source[i + 1] == "0" else "false")
            i += 1
        elif source.startswith("void 0", i):
            out.append("null")
            i += 5
        elif (key := re.match(r"[A-Za-z_$][\w$]*(?=\s*:)", source[i:])) and source[i - 1] in "{,":
            out.append(f'"{key.group()}"')
            i += key.end() - 1
        else:
            out.append(c)
        i += 1
    return json.loads("".join(out))


def literal_at(js, start):
    return js_literal(js[start : matching_bracket(js, start) + 1])


def extract_programs(js):
    anchor = js.find("targetAsOfDate:")
    start = js.rfind("[{", 0, anchor) if anchor >= 0 else -1
    if start < 0:
        raise RuntimeError("program array not found")
    programs = literal_at(js, start)
    if not all(p.keys() >= PROGRAM_KEYS for p in programs):
        raise RuntimeError("program array has unexpected shape")
    return programs


def extract_headline(js):
    start = js.find("items:[{val:")
    if start < 0:
        return []
    tiles = []
    for item in literal_at(js, start + len("items:")):
        total = re.search(r"[Oo]f ([\d,]+)", item.get("label", ""))
        upcoming = str(item.get("upcoming", ""))
        tiles.append(
            {
                "project": item.get("projectName") or item.get("label"),
                "completed": int(str(item["val"]).replace(",", "")),
                "total": int(total.group(1).replace(",", "")) if total else None,
                "percent": item.get("progress"),
                "upcomingThisMonth": int(upcoming) if upcoming.isdigit() else None,
                "label": item.get("label"),
            }
        )
    return tiles


def extract_as_of(js):
    match = re.search(r"[Dd]ata current as of (\d{1,2})/(\d{1,2})/(\d{4})", js)
    if not match:
        raise RuntimeError("'Data current as of' date not found")
    month, day, year = map(int, match.groups())
    return dt.date(year, month, day).isoformat()


def build_snapshot(js, bundle_url):
    programs = extract_programs(js)
    digest = hashlib.sha256(json.dumps(programs, sort_keys=True).encode()).hexdigest()[:16]
    return {
        "asOf": extract_as_of(js),
        "capturedAt": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": SITE,
        "bundle": bundle_url,
        "programsHash": digest,
        "programs": programs,
        "headline": extract_headline(js),
    }


def change_summary(previous, snapshot):
    before = {p["id"]: p["completed"] for p in previous["programs"]} if previous else {}
    since = f" since {previous['asOf']}" if previous else ""
    lines = [
        f"### FAA tracker as of {snapshot['asOf']}{since}",
        "",
        "| Program | Before | Now | Change | Total |",
        "|---|---:|---:|---:|---:|",
    ]
    for p in snapshot["programs"]:
        prior = before.get(p["id"])
        prior_cell, change = ("", "") if prior is None else (prior, f"{p['completed'] - prior:+}")
        lines.append(f"| {p['name']} | {prior_cell} | {p['completed']} | {change} | {p['totalPlanned']} |")
    return "\n".join(lines) + "\n"


def fetch():
    try:
        url, js = fetch_with_urllib()
        extract_programs(js)
        return url, js
    except Exception as e:
        print(f"plain fetch failed ({e}); using headless browser", file=sys.stderr)
        return fetch_with_browser()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", help="parse a saved bundle instead of fetching")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        url, js = (f"file:{args.bundle}", Path(args.bundle).read_text()) if args.bundle else fetch()
        snapshot = build_snapshot(js, url)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    store = json.loads(SNAPSHOTS.read_text()) if SNAPSHOTS.exists() else {"snapshots": []}
    last = store["snapshots"][-1] if store["snapshots"] else None
    if last and (last["asOf"], last["programsHash"]) == (snapshot["asOf"], snapshot["programsHash"]):
        print(f"unchanged (as of {snapshot['asOf']})")
        return 3

    for p in snapshot["programs"]:
        print(f"{p['name']:<36} {p['completed']:>6} / {p['totalPlanned']:<6} plan {p.get('targetAsOfDate')}")
    if args.dry_run:
        return 0

    if last and last["asOf"] == snapshot["asOf"]:
        store["snapshots"][-1] = snapshot
    else:
        store["snapshots"].append(snapshot)
    store["updated"] = snapshot["capturedAt"]
    SNAPSHOTS.write_text(json.dumps(store, indent=2) + "\n")
    if summary_path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary_path, "a") as f:
            f.write(change_summary(last, snapshot))
    print(f"wrote snapshot {snapshot['asOf']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
