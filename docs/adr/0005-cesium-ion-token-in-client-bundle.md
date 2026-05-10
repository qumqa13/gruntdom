# ADR-0005 — Cesium ION free-tier token shipped as `NEXT_PUBLIC_CESIUM_ION_TOKEN`

- **Status**: Accepted (2026-05-10 — Oskar's F2-T1 milestone-1 round-trip)
- **Companion to**: ADR-0002 §2.7 (secret hygiene), ADR-0002 §6.3 (3-tier terrain ladder)
- **Will be reviewed**: when one of the revisit triggers (§4) fires.

---

## 1. Context

ADR-0002 §2.7 (as originally written) declared a build-time grep gate that rejected the substring `cesium-ion` anywhere in `.next/static/`. The intent was to prevent ION-related credentials from leaking into the client bundle. Standard Cesium ION JS auth, however, requires `Cesium.Ion.defaultAccessToken = '<token>'` to be set in the **browser** before any ION asset request — the JS engine in the browser is the bearer. Free-tier ION tokens are designed for this pattern: the ION dashboard pins each token to specific domains and ION asset IDs, so token exposure on a domain-restricted token is not equivalent to leaking a server-bearer secret.

This created a contradiction: the standard pattern Oskar wants (Tier 2 ION terrain in F2 MVP, per the F2 kick-off briefing) cannot ship without changing §2.7's gate, because the env var name `NEXT_PUBLIC_CESIUM_ION_TOKEN` literally contains the substring `cesium-ion` and would be inlined into the client bundle by Next.js.

## 2. Decision

We ship the Cesium ION free-tier token as `NEXT_PUBLIC_CESIUM_ION_TOKEN`, exposed in the client bundle. The grep gate in ADR-0002 §2.7 is amended:

- **Remove**: the bare substring `cesium-ion` from the forbidden-pattern list.
- **Add**: the FQDN substring `https://ion.cesium.com` to the forbidden-pattern list. The JWT issuer URL appears verbatim in any leaked **server-bearer** ION credential or paid-tier token wrapper, but is *not* present in the encoded payload of the domain-restricted free-tier JWT we ship.

The carve-out is single-line, with an inline comment in the gate cross-referencing this ADR.

## 3. Why this is safe enough for F2 MVP

| Concern | Mitigation |
|---|---|
| Token theft from page source | ION dashboard restricts the token to specific domains (gruntdom.pl + Vercel preview wildcards) before the first public deploy. Theft → re-use elsewhere fails domain check at ION's edge. |
| Cost vector via stolen token | Free tier 5 GB/mo. If a hostile party manages to bypass domain restriction, the worst case is exhausting our monthly quota; ION usage dashboard alerts at 80 % cap (per ADR-0002 §2.6 cost discipline). No billing surprise. |
| Future paid-tier upgrade | A paid-tier ION key has different cost dynamics. Triggering a paid upgrade fires the revisit clock on this ADR (§4). |
| Provider switch (Mapbox / Google) | Both have **server-bearer** patterns for restricted tokens. Provider switch fires the revisit clock. |

## 4. Revisit triggers

Reopen this ADR (and likely move to Path B, server-side proxy `/api/cesium/{terrain,imagery}/*`) if any of:

1. **Cost trigger**: production traffic exceeds 80 % of free-tier quota (5 GB/mo) → consider paid tier; paid-tier tokens may need server-bearer pattern depending on ION pricing structure at the time.
2. **Provider switch**: replacing ION with a provider whose recommended pattern is server-bearer-only (Mapbox private tokens, Google Maps Tile API restricted keys). The Path-B proxy infrastructure will be needed anyway.
3. **Compromise incident**: any verified token theft or quota-exhaustion-by-third-party event. Rotate the token, then commit to Path B before the next deploy.

## 5. Operational items at first public deploy (USER-action)

- Set domain restriction on the token in https://cesium.com/ion/tokens — allow `*.gruntdom.pl` (production) + the Vercel preview wildcard (`*-gruntdom.vercel.app` or whatever pattern the deployment surfaces). Reject all other domains.
- Set asset restriction — limit the token to ION asset IDs the app actually uses (terrain asset 1 + Bing imagery asset 2 if that's what we end up consuming; tighten to "verified ground truth" only).
- Confirm 80 %-cap alert is enabled in the ION usage dashboard email-notification settings.

## 6. Implementation note

`docs/F2/T1-spike-result.md` captures the Path A vs Path B trade-off in operational detail; this ADR is the durable decision record that survives after the spike doc rotates out.

The grep gate change is the only `.next/static/` build-time concern. Runtime ION calls already work via the standard `Cesium.Ion.defaultAccessToken` global, set in `src/components/3d/Plot3DViewClient.tsx`.
