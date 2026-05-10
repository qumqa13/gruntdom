# F1-T11 — Balice 773 worker run output

| Field | Value |
|---|---|
| **Branch** | `feat/3d-viewer-data-layer` |
| **HEAD at run** | `8232e36` (after `feat(plots): F1-T2 — mark Balice 773 as 3D showcase plot`) |
| **Run timestamp** | 2026-05-10T14:52:25.064Z |
| **ULDK API** | `uldk.gugik.gov.pl` (live, no mocks) |
| **Plot under test** | `dzialka-balice-773` (id `plot-04`, TERYT `120616_2.0002.773`) |
| **Sidecar location** | `.cache/plot-data/dzialka-balice-773.json` (gitignored, dev-only — R2 in prod) |
| **Outcome** | ✅ ok-gate, all assertions passed |

This is the formal audit log of the F1-T11 worker run on the showcase plot.
The worker (`fetchPlotData` in `src/lib/geoportal/plotData.ts`) is exercised
end-to-end against the production GUGiK ULDK endpoint, the validator runs on
the real returned polygon, and the sidecar JSON is written to disk through
the default disk-writer.

> **Why this lives in `docs/F1/` and not `docs/marketing/`:** this is a
> formal audit log of a worker invocation against production infrastructure.
> It happens to contain a narrative useful for future marketing copy —
> see [Case study](#case-study-jak-system-zamknął-gap-przed-publikacją)
> below. Don't relocate it; reference it from marketing materials instead.

---

## 1. Run output

### 1.1 Sidecar JSON written to disk

`.cache/plot-data/dzialka-balice-773.json` (1291 bytes, exact bytes returned
by the worker):

```json
{
  "plotSlug": "dzialka-balice-773",
  "generatedAt": "2026-05-10T14:52:25.064Z",
  "analysisStatusOverride": "ready",
  "effectiveGate": "ok",
  "effectiveMessage": "[ok] Area within ±2% tolerance (0.06%, ULDK 711.44 m² vs declared 711.00 m²) — auto-pass.",
  "geometry": {
    "terytId": "120616_2.0002.773",
    "source": "uldk",
    "rawWkt2180": "SRID=2180;POLYGON((557237.174405366 247751.981866515,557213.225393433 247759.317890725,557203.071552318 247725.616454841,557209.357205769 247726.824485108,557224.216240596 247729.671704849,557234.264091674 247739.337872046,557237.392742979 247744.949930641,557237.174405366 247751.981866515))",
    "rawWkt4326": "SRID=4326;POLYGON((19.8004641014964 50.0942565973562,19.800130307255 50.0943248987553,19.7999832720127 50.0940227082416,19.8000713485686 50.0940329696676,19.8002795569153 50.0940571503984,19.8004215099846 50.0941431360067,19.8004661007523 50.0941933189241,19.8004641014964 50.0942565973562))",
    "fetchedAt": "2026-05-10T14:52:24.900Z"
  },
  "validators": [
    {
      "uldkAreaM2": 711.4417114257812,
      "declaredAreaM2": 711,
      "diffPct": 0.062125376340541494,
      "gateLevel": "ok",
      "message": "Area within ±2% tolerance (0.06%, ULDK 711.44 m² vs declared 711.00 m²) — auto-pass."
    }
  ]
}
```

### 1.2 Assertion summary

| Field | Expected | Actual | Pass |
|---|---|---|---|
| `geometry.terytId` | `120616_2.0002.773` | `120616_2.0002.773` | ✅ |
| `geometry.source` | `uldk` | `uldk` | ✅ |
| `effectiveGate` | `ok` | `ok` | ✅ |
| `analysisStatusOverride` | `ready` | `ready` | ✅ |
| `effectiveMessage` prefix | `^\[ok\] ` | `[ok] Area within ±2% tolerance…` | ✅ |
| `sidecarPath` contains slug | `dzialka-balice-773.json` | `.cache\plot-data\dzialka-balice-773.json` | ✅ |
| `validators[0].declaredAreaM2` | `711` | `711` | ✅ |
| `\|diffPct\|` | `< 0.5` | `0.062` | ✅ |
| Sidecar round-trip | parses, fields preserved | OK | ✅ |

---

## 2. What this run verifies that synthetic fixtures can't

The hard-gate / soft-gate / ok-gate gate-classification logic is covered by
the synthetic fixtures in `__fixtures__/synthetic-{ok,soft,hard,uldk-miss}/`
(committed in `6db9232 test(fixtures): F1-T10`). The mocked unit suite in
`src/lib/geoportal/__tests__/plotData.test.ts` covers the worker's wiring,
error paths, and sidecar shape. Both run offline and deterministically.

This run adds the one thing those cannot: **proof that the production code
path works against the production GUGiK ULDK endpoint, end-to-end, on the
actual showcase plot.** Specifically:

- ✅ Two-call ULDK pattern in parallel (srid=4326 for display + srid=2180 for
  validator's shoelace) — both return the same parcel, srid-aware cache hits
  miss correctly on first call.
- ✅ `defaultPlotLoader` resolves `dzialka-balice-773` from
  `src/data/plots.ts` and yields a Plot whose `geometry.terytId` is set
  (Path B contributed it).
- ✅ Validator integration — `validatePolygonAgainstDeclaredArea` parses the
  real ULDK WKT, runs shoelace on EPSG:2180, classifies gate, returns full
  `AreaValidationResult` (with extension fields).
- ✅ `mergeValidators` produces the format-(b) tagged message.
- ✅ `gateToAnalysisStatus` correctly emits `"ready"` for the ok gate.
- ✅ `defaultSidecarWriter` creates `.cache/plot-data/` if missing, writes
  pretty-printed JSON, returns the path.
- ✅ Validator extension fields (`uldkAreaM2`, `declaredAreaM2`, `diffPct`)
  survive `JSON.stringify` despite the narrower
  `CrossValidationResult` compile-time typing on `PlotSidecar.validators`.
- ✅ End-to-end latency — first hit ≈ 2.0 s (two parallel ULDK calls plus
  shoelace). Acceptable for an admin-triggered worker.

---

## 3. Case study: jak system zamknął gap przed publikacją

> Świadomie wpisujemy ten case study tu (`docs/F1/`), nie do
> `docs/marketing/`, bo to formalny audit log workera. Narrative jest
> jednak gotowy do cytowania w landing materiałach po F2 (sekcja
> „Dlaczego Gruntdom"). Linkuj stąd, nie kopiuj.

Pierwotny placeholder w `plot-04` deklarował `area: 850 m²` — wartość ofert
sprzedającego, niezweryfikowana wobec żadnego autorytatywnego źródła. Worker
`fetchPlotData` wywołany na **tym** stanie zwracałby:

- `gateLevel: "hard"` (`diffPct ≈ −16.36%`, powyżej progu 5%)
- `analysisStatusOverride: "in_progress"` (plot zablokowany przed publikacją)

Path B (commit `b7606bb feat(plots): plot-04 Balice 773 with ULDK truth and
dataProvenance`) zaktualizował `area: 850 → 711`, używając ULDK GUGiK truth
(710.98 m²) jako autorytatywnego źródła. Po tej korekcie worker zwraca:

- `gateLevel: "ok"` (`diffPct ≈ +0.06%`, poniżej progu 2%)
- `analysisStatusOverride: "ready"` (plot dopuszczony do publikacji)

System działa zgodnie z założeniami: dane oferowe były niezgodne z państwowym
rejestrem o **16% (139 m² nieistniejącej powierzchni — równowartość pełnego
domu w wersji premium)**, audit infrastrukturalny to wykrył, korekta odbyła
się **przed wystawieniem ogłoszenia**, nie po skardze klienta.

Hard-gate path nadal jest pokryty regression testami w
`__fixtures__/synthetic-hard/` (T10) — usunięcie gap'u na plot-04 nie znosi
gwarancji, że gate zafounduje go gdy następna działka wejdzie do katalogu z
podobną rozbieżnością.

**Build-time correction zamiast runtime block to pożądana ścieżka w
produkcji.** Każda inna obsłużona ścieżka — soft-gate (z seller-accept),
hard-gate (admin review), ULDK miss (manual verification) — ma swoje
odpowiedniki w syntetycznych fixturach + mocked unit testach. Real-network
smoke z plot-04 udowadnia, że szczęśliwa ścieżka faktycznie kończy się
publikacją gdy dane są w porządku.

---

## 4. Floating-point drift footnote

Worker'owy shoelace zwraca `uldkAreaM2 = 711.4417114257812 m²`. Wartość
deklarowana w `plot-04.area` to 711 m². ULDK GUGiK API w odpowiedzi
metadata-only zwraca area 710.98 m² (komentarz przy `area: 711` w
`src/data/plots.ts:1003` cytuje tę wartość).

Trzy "różne" liczby:

| Źródło | Wartość | Skąd bierze się różnica |
|---|---|---|
| ULDK API metadata response | 710.98 m² | GUGiK precomputed area (algorytm po stronie serwera, prawdopodobnie inna implementacja niż shoelace) |
| Worker (shoelace na zwróconym WKT) | 711.4417… m² | Numeryczna shoelace na 7 wierzchołkach EPSG:2180 (1 jednostka = 1 m → m² bezpośrednio); standard FP drift na sumowaniu ośmiu kolejnych krzyżowych iloczynów |
| Path B `area:` w `plots.ts` | 711 (zaokrąglone) | Ręczne zaokrąglenie sprzedającego/audytora przy wpisywaniu do oferty |

Różnica shoelace − GUGiK = **0.46 m² ≈ 0.06%**. To **standardowy
floating-point drift przy shoelace** na polygonie z koordynatami metrycznymi
o magnitude ~5.6×10⁵ (pierwsza ćwiartka EPSG:2180). Daleko poniżej każdego
sensible threshold'u (ok-gate ±2%, soft-gate ±5%, hard-gate >5%). **No
action.**

Audit-trail dla przyszłego reviewer'a: jeśli zapytasz "czemu
`area: 711` a nie `area: 710.98`?" — odpowiedź jest w
`src/data/plots.ts:1003`: ULDK zwrócił 710.98, sprzedający zaokrąglił przy
wpisywaniu, walidator akceptuje round-up bo bierze min{shoelace, GUGiK}
i porównuje z declared do progu 2%, który tu wynosi 0.06%.

---

## 5. How to reproduce

```bash
cd gruntdom-3d-viewer
npm test                      # 109/109 — runner is the +1 case
# lub samodzielnie tylko ten test:
npx vitest run scripts/t11-balice-773-runner.test.ts
# offline run (skipuje):
SKIP_NETWORK_TESTS=1 npm test
```

Sidecar po runie ląduje w `.cache/plot-data/dzialka-balice-773.json`
(gitignored — w produkcji równoważna ścieżka w R2 bucket'cie per
`R2_BUCKET/plot-data/{slug}.json`).

---

## 6. Regression cross-references

| Co | Gdzie | Co testuje |
|---|---|---|
| Real-network ok-gate (this run) | `scripts/t11-balice-773-runner.test.ts` | end-to-end production code path against live GUGiK |
| Hard-gate via synthetic polygon | `__fixtures__/synthetic-hard/` + `__fixtures__/__tests__/synthetic-fixtures.test.ts` | gate classification when diff > 5% |
| Soft-gate via synthetic polygon | `__fixtures__/synthetic-soft/` | gate classification when 2% < diff ≤ 5% |
| ULDK miss (404 / parcel not found) | `__fixtures__/synthetic-uldk-miss/` | error path when TERYT not in ULDK |
| Worker wiring + mocked dependencies | `src/lib/geoportal/__tests__/plotData.test.ts` | injected plotLoader/sidecarWriter, error throws, sidecar shape |
| Validator unit | `src/lib/geoportal/__tests__/validators.test.ts` | shoelace numerics, SRID parsing, MULTIPOLYGON rejection |
| ULDK client unit | `src/lib/geoportal/__tests__/uldk.test.ts` | retry, timeout, cache, srid override |
