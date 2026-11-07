#!/usr/bin/env python3
"""Resolve the symbol list the data workflow should fetch.

The list is the UNION of:
  1. data/universe.json  -- the committed default
  2. every open issue labelled `portfolio`, whose body contains a fenced
     ```json or ```yaml block listing symbols

Why the issue BODY and not an attachment: issue attachments are served from
github.com, which sends no Access-Control-Allow-Origin (verified 2026-09-29),
so the browser could never read them. api.github.com does send `*`, and it
returns the body inline -- so the body is the only transport that works on
both sides.

TRUST BOUNDARY: anyone can open an issue, so the label alone is not an
authorization check. Only issues whose author_association is OWNER, MEMBER or
COLLABORATOR are honoured. Without that, a stranger could drive the workflow's
fetch list by filing an issue.

Prints a comma-separated list on stdout for the workflow to consume.
"""
from __future__ import annotations

import json, os, re, sys, urllib.error, urllib.request
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
UNIVERSE  = ROOT / "data" / "universe.json"
TRUSTED   = {"OWNER", "MEMBER", "COLLABORATOR"}
SYM_RE    = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,9}$")
MAX_EXTRA = 200          # cap: a runaway issue must not blow the API budget
FENCE_RE  = re.compile(r"```(?:json|yaml|yml)?\s*\n(.*?)```", re.S | re.I)


def parse_symbols(body: str) -> list[str]:
    """Pull symbols out of the first fenced block that yields any.

    Accepts JSON ({"symbols":[...]} or a bare array) and the small subset of
    YAML people actually write in an issue (a `symbols:` key over `- TICKER`
    list items). Deliberately no YAML dependency -- the repo stays zero-install.
    """
    for block in FENCE_RE.findall(body or ""):
        block = block.strip()
        syms: list[str] = []
        try:
            doc = json.loads(block)
            if isinstance(doc, dict):
                doc = doc.get("symbols", [])
            if isinstance(doc, list):
                syms = [s.get("sym") if isinstance(s, dict) else s for s in doc]
        except (json.JSONDecodeError, AttributeError):
            for line in block.splitlines():
                line = line.strip()
                m = re.match(r"^-\s*(?:sym:\s*)?[\"']?([A-Za-z0-9.\-]+)[\"']?\s*$", line)
                if m:
                    syms.append(m.group(1))
        out = [str(s).upper().strip() for s in syms if s]
        out = [s for s in out if SYM_RE.match(s)]
        if out:
            return out
    return []


def fetch_portfolio_issues(repo: str, token: str | None) -> list[str]:
    url = f"https://api.github.com/repos/{repo}/issues?labels=portfolio&state=open&per_page=100"
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "alpha-seeker-data/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            issues = json.load(r)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
        print(f"  ! could not read portfolio issues ({e}); using universe.json only",
              file=sys.stderr)
        return []

    found: list[str] = []
    for it in issues:
        if "pull_request" in it:
            continue
        who = it.get("author_association", "NONE")
        if who not in TRUSTED:
            print(f"  ! issue #{it['number']} ignored: author_association={who} "
                  f"(needs {'/'.join(sorted(TRUSTED))})", file=sys.stderr)
            continue
        syms = parse_symbols(it.get("body", ""))
        if syms:
            print(f"  + issue #{it['number']} '{it.get('title','')[:40]}': {len(syms)} symbol(s)",
                  file=sys.stderr)
            found += syms
        else:
            print(f"  ! issue #{it['number']} has no parsable ```json/```yaml block",
                  file=sys.stderr)
    return found


def main() -> int:
    base = [e["sym"] for e in json.loads(UNIVERSE.read_text())["symbols"]]
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    extra: list[str] = []
    if repo:
        extra = fetch_portfolio_issues(repo, os.environ.get("GITHUB_TOKEN"))
    else:
        print("  (GITHUB_REPOSITORY unset; skipping portfolio issues)", file=sys.stderr)

    extra = [s for s in dict.fromkeys(extra) if s not in set(base)][:MAX_EXTRA]
    print(f"  universe={len(base)} + portfolios={len(extra)}", file=sys.stderr)
    print(",".join(base + extra))
    return 0


if __name__ == "__main__":
    sys.exit(main())
