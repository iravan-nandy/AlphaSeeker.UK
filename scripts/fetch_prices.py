#!/usr/bin/env python3
"""Build data/snapshot.json for the Alpha-Seeker static site.

Runs SERVER-SIDE ONLY (GitHub Actions or a developer's machine). This exists
because no free market-data API allows direct browser calls at this scale:

  * eodhd.com, query1/2.finance.yahoo.com  -> no Access-Control-Allow-Origin
  * api.allorigins.win, api.codetabs.com   -> down / rate-limited
  * corsproxy.io (keyless)                 -> discontinued
  * stooq.com                              -> JS anti-bot challenge

Fetching here keeps the API key out of the browser entirely and turns the
client's 84-plus requests into a single same-origin GET.

Pure Python 3 standard library -- no pip install, in either environment.

  EODHD_API_KEY=... python3 scripts/fetch_prices.py
  EODHD_API_KEY=... python3 scripts/fetch_prices.py --dry-run
"""
from __future__ import annotations

import argparse, concurrent.futures as cf, datetime as dt, json, os, sys, urllib.error
import urllib.parse, urllib.request
from pathlib import Path

ROOT       = Path(__file__).resolve().parent.parent
UNIVERSE   = ROOT / "data" / "universe.json"
OVERRIDES  = ROOT / "data" / "overrides"
SNAPSHOT   = ROOT / "data" / "snapshot.json"
META       = ROOT / "data" / "meta.json"

SCHEMA      = 1
BARS        = 520      # see docs/DATA.md: >=250 needed for the 200-day MAs the
                       # setups lean on; 520 keeps profileStock's occurrence
                       # counts level with the monolith's 563-bar window.
LOOKBACK_D  = 800
WORKERS     = 8
TIMEOUT     = 30

# Index/macro series the market-regime bar needs. The monolith fetched these
# from TradingView, which returns no history, so trendOf() always saw an empty
# closes array and the regime read was permanently "Neutral / Mixed".
MACRO = {"SPY": "SPY.US", "QQQ": "QQQ.US", "IWM": "IWM.US", "UUP": "UUP.US",
         "GLD": "GLD.US", "USO": "USO.US", "BTC-USD": "BTC-USD.CC"}


def eodhd_symbol(sym: str) -> str:
    """Mirror of eodhdSymbol() in the monolith (line 1510)."""
    special = {"QQQ": "QQQ.US", "HYG": "HYG.US", "^VIX": "VIX.INDX",
               "BTC-USD": "BTC-USD.CC", "DX-Y.NYB": "DXY.INDX"}
    return special.get(sym, f"{sym}.US")


def calc_atr(highs, lows, closes, n: int = 14):
    """Byte-for-byte port of calcATR() in js/stats/atr.js (Wilder smoothing).

    Shipped precomputed so the snapshot does not have to carry highs/lows for
    every bar. ATR depends only on history, never on the live price, so the
    precomputed value is exactly what the browser would have calculated.
    """
    if not highs or not lows or not closes or len(closes) < n + 1:
        return None
    trs = []
    for i in range(1, len(closes)):
        h, l, pc = highs[i], lows[i], closes[i - 1]
        if h is None or l is None or pc is None:
            continue
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    if len(trs) < n:
        return None
    atr = sum(trs[:n]) / n
    for k in range(n, len(trs)):
        atr = (atr * (n - 1) + trs[k]) / n
    return atr


def http_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "alpha-seeker-data/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.load(r)


CACHE = ROOT / ".cache" / "eodhd"


def fetch_symbol(sym: str, token: str, frm: str, use_cache: bool = False):
    cached = CACHE / f"{sym}.json"
    if use_cache and cached.is_file():
        return sym, json.loads(cached.read_text()), None
    url = (f"https://eodhd.com/api/eod/{urllib.parse.quote(eodhd_symbol(sym))}"
           f"?fmt=json&period=d&from={frm}&api_token={urllib.parse.quote(token)}")
    try:
        rows = http_json(url)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
        return sym, None, f"{type(e).__name__}: {e}"
    if not isinstance(rows, list) or not rows:
        return sym, None, "empty or non-list response"
    if use_cache:
        CACHE.mkdir(parents=True, exist_ok=True)
        cached.write_text(json.dumps(rows))
    return sym, rows, None


def load_overrides() -> dict:
    """Hand-authored bars committed to data/overrides/<SYM>.json win over the
    vendor. Use for tickers the vendor does not carry, to patch a bad bar, or to
    ship a synthetic series for testing."""
    out = {}
    if not OVERRIDES.is_dir():
        return out
    for p in sorted(OVERRIDES.glob("*.json")):
        try:
            doc = json.loads(p.read_text())
            rows = doc["bars"] if isinstance(doc, dict) else doc
            assert isinstance(rows, list) and rows
            out[p.stem.upper()] = rows
        except Exception as e:
            print(f"  ! override {p.name} ignored: {e}", file=sys.stderr)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="fetch and validate, write nothing")
    ap.add_argument("--bars", type=int, default=BARS)
    ap.add_argument("--symbols", help="comma-separated override of the symbol list")
    ap.add_argument("--cache", action="store_true",
                    help="cache raw vendor responses in .cache/ (local development only)")
    args = ap.parse_args()

    token = os.environ.get("EODHD_API_KEY", "").strip()
    if not token:
        print("EODHD_API_KEY is not set.", file=sys.stderr)
        return 2

    universe = json.loads(UNIVERSE.read_text())
    if args.symbols:
        wanted = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    else:
        wanted = [e["sym"] for e in universe["symbols"]]
        extra = os.environ.get("EXTRA_SYMBOLS", "")
        wanted += [s.strip().upper() for s in extra.split(",") if s.strip()]
    wanted = list(dict.fromkeys(wanted + list(MACRO)))

    frm = (dt.date.today() - dt.timedelta(days=LOOKBACK_D)).isoformat()
    overrides = load_overrides()
    print(f"fetching {len(wanted)} symbols from {frm} ({len(overrides)} override(s) on disk)")

    results, errors = {}, {}
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for sym, rows, err in ex.map(lambda s: fetch_symbol(s, token, frm, args.cache), wanted):
            if err:
                errors[sym] = err
            else:
                results[sym] = rows
    for sym, rows in overrides.items():
        results[sym] = rows
        errors.pop(sym, None)
        print(f"  override applied: {sym} ({len(rows)} bars)")

    if errors:
        print(f"  {len(errors)} symbol(s) failed:", file=sys.stderr)
        for s, e in list(errors.items())[:10]:
            print(f"    {s}: {e}", file=sys.stderr)

    # Shared trading calendar: EQUITY trading days only, ascending.
    #
    # Crypto is deliberately excluded from the union. BTC-USD trades 7 days a
    # week, so including it injected ~150 weekend dates into a 520-slot window
    # and left every equity with only 357 real bars -- which would have quietly
    # starved profileStock's 200-day setups.
    #
    # The newest date is dropped unless a clear majority of equities have
    # reported it, so an in-progress session cannot leave every close null.
    crypto = {s for s in results if s.endswith("-USD")}
    eq_dates = {}
    for sym, rows in results.items():
        if sym in crypto:
            continue
        for r in rows:
            eq_dates[r["date"]] = eq_dates.get(r["date"], 0) + 1
    n_eq = max(1, len(results) - len(crypto))
    cal = sorted(d for d, k in eq_dates.items() if k >= 0.5 * n_eq)[-args.bars:]
    dropped = sorted(set(eq_dates) - set(cal))[-3:]
    if dropped:
        print(f"  dropped sparse/partial session(s): "
              f"{[(d, eq_dates[d]) for d in dropped if eq_dates[d] < 0.5 * n_eq]}")
    idx = {d: i for i, d in enumerate(cal)}

    symbols = {}
    for sym, rows in results.items():
        c = [None] * len(cal); v = [None] * len(cal)
        h = [None] * len(cal); l = [None] * len(cal)
        for r in rows:
            i = idx.get(r["date"])
            if i is None:
                continue
            c[i] = round(float(r["adjusted_close"]), 4)
            v[i] = int(r["volume"])
            h[i] = round(float(r["high"]), 4)
            l[i] = round(float(r["low"]), 4)
        if sym in crypto:
            # Align 7-day crypto onto the equity calendar; carry the last known
            # value across any gap so the macro tile always has a series.
            last = None
            for i in range(len(c)):
                if c[i] is None and last is not None:
                    c[i] = last
                elif c[i] is not None:
                    last = c[i]
        atr = calc_atr(h, l, c, 14)
        symbols[sym] = {
            "c": c, "v": v,
            "atr14": None if atr is None else round(atr, 4),
            "bars": sum(1 for x in c if x is not None),
        }

    last_bar = cal[-1] if cal else None
    snapshot = {"schema": SCHEMA, "generatedAt": dt.datetime.now(dt.timezone.utc)
                                  .isoformat(timespec="seconds").replace("+00:00", "Z"),
                "source": "eodhd", "lastBarDate": last_bar,
                "calendar": cal, "symbols": symbols}

    # ---- publication gate: never ship a partial snapshot over a good one ----
    core = [e["sym"] for e in universe["symbols"]]
    got  = [s for s in core if s in symbols]
    thin = [s for s in got if symbols[s]["bars"] < 250]
    stale_by = None
    if last_bar:
        stale_by = (dt.date.today() - dt.date.fromisoformat(last_bar)).days

    problems = []
    if len(got) < 0.9 * len(core):
        problems.append(f"only {len(got)}/{len(core)} core symbols fetched (need 90%)")
    if len(thin) > 0.1 * len(core):
        problems.append(f"{len(thin)} symbols have <250 bars: {thin[:8]}")
    if stale_by is None or stale_by > 5:
        problems.append("no bars returned at all" if last_bar is None
                        else f"last bar {last_bar} is {stale_by} days old (max 5)")

    age = "unknown age" if stale_by is None else f"{stale_by}d old"
    print(f"\ncore symbols: {len(got)}/{len(core)} | macro: "
          f"{sum(1 for m in MACRO if m in symbols)}/{len(MACRO)} | bars: {len(cal)} "
          f"| last: {last_bar} ({age}) | thin: {len(thin)}")

    if problems:
        print("\nREFUSING TO PUBLISH:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print("Previous snapshot stays live.", file=sys.stderr)
        return 1

    if args.dry_run:
        print("--dry-run: validated, nothing written")
        return 0

    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(snapshot, separators=(",", ":")))
    META.write_text(json.dumps({k: snapshot[k] for k in
                                ("schema", "generatedAt", "source", "lastBarDate")}
                               | {"symbolCount": len(symbols), "bars": len(cal),
                                  "failed": sorted(errors)}, indent=2) + "\n")
    size = SNAPSHOT.stat().st_size
    print(f"wrote {SNAPSHOT.relative_to(ROOT)} ({size/1024:.0f} KB raw)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
