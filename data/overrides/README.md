Hand-authored price data. Anything here is committed and **overrides** the
vendor fetch for that symbol.

Name the file `<SYMBOL>.json` (e.g. `ACME.json`) and use the vendor row shape:

```json
[
  {"date":"2026-09-25","open":10.0,"high":10.8,"low":9.7,"close":10.5,"adjusted_close":10.5,"volume":120000},
  {"date":"2026-09-28","open":10.5,"high":11.2,"low":10.4,"close":11.0,"adjusted_close":11.0,"volume":98000}
]
```

Useful for a ticker the vendor does not carry, patching a bad bar, or shipping a
synthetic series for testing. Supply at least ~250 rows or the 200-day averages
the setups rely on will not have enough runway.
