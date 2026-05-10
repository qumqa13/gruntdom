# Service-level objectives

## Performance budgets

- **LCP** (plot detail with `threeDDemoStatus === "showcase"`): ≤ 4 s on P75 cold cache. Breach for two consecutive weeks triggers F1-T8 (3D preview thumbnail) per ADR-0004 §5.2. Measurement: real-user Web Vitals collected via `next/web-vitals` reporter (TBD wiring); until that ships, treat this as an aspirational budget verified manually with Lighthouse on a P75-equivalent network throttle.
