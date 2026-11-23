#!/usr/bin/env python3
"""Loads the dashboard in headless Chromium and fails on script errors or empty sections."""

import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = [
    "tiles",
    "statusChart",
    "paceTable",
    "multiples",
    "schedChart",
    "approChart",
    "spendChart",
    "contractTable",
    "compChart",
    "ageChart",
    "timeline",
    "scoreChart",
    "heatChart",
    "gapChart",
    "cards",
    "srcList",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def check(page, url, scheme):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.emulate_media(color_scheme=scheme)
    page.goto(url, wait_until="networkidle")
    empty = page.evaluate("ids => ids.filter(id => !document.getElementById(id)?.children.length)", REQUIRED)
    return [f"{scheme}: {e}" for e in errors] + [f"{scheme}: #{i} is empty" for i in empty]


def main():
    server = serve()
    url = f"http://127.0.0.1:{server.server_port}/index.html"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        problems = []
        for scheme in ("light", "dark"):
            page = browser.new_page(viewport={"width": 1180, "height": 900})
            problems += check(page, url, scheme)
            page.close()
        browser.close()
    server.shutdown()

    if problems:
        sys.exit("render check failed:\n  " + "\n  ".join(problems))
    print(f"ok: {len(REQUIRED)} sections rendered in light and dark")


if __name__ == "__main__":
    main()
