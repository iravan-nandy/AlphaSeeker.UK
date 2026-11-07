#!/usr/bin/env python3
"""Refresh test/fixtures/bars.json from a built data/snapshot.json.

The golden test needs real bars but must run from a clean checkout, and the
snapshot is generated and gitignored -- so a small slice of it is frozen here.
Run after scripts/fetch_prices.py, then re-run `node test/golden.mjs --write`.
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SYMS = ['NVDA', 'IONQ', 'OKLO', 'LMT', 'MSTR', 'HIMS', 'ASML', 'SPY']
src = ROOT / 'data' / 'snapshot.json'
if not src.exists():
    sys.exit('data/snapshot.json missing — run scripts/fetch_prices.py first')
snap = json.loads(src.read_text())
missing = [s for s in SYMS if s not in snap['symbols']]
if missing:
    sys.exit(f'snapshot is missing {missing}')
out = {'_comment': ('Frozen real bars for the statistics regression lock. Committed on purpose: '
                    'test/golden.mjs must be reproducible from a clean checkout, and '
                    'data/snapshot.json is generated and gitignored. '
                    'Regenerate with scripts/make_test_bars.py.'),
       'lastBarDate': snap['lastBarDate'],
       'symbols': {s: {'c': snap['symbols'][s]['c'], 'v': snap['symbols'][s]['v']} for s in SYMS}}
dst = ROOT / 'test' / 'fixtures' / 'bars.json'
dst.write_text(json.dumps(out, separators=(',', ':')))
print(f'wrote {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)')
