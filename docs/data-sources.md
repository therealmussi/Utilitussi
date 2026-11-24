# Data sources

## Design goals

1. **Modularity** — every statistic is a typed `PricePoint`: `{ value, source }`, where
   `source` carries `name`, `referenceDate`, `confidence` and `kind`
   (`official | aggregated | estimate | illustrative`).
2. **Traceability** — UI never renders a bare number without the ability to show its
   source, reference date and confidence badge.
3. **Honesty** — missing data renders as `—`; illustrative values are self-declared.

## Current state of this build

| Source | Used for | Access | Status |
| --- | --- | --- | --- |
| Numbeo | Cost-of-living taxonomy, city indices | Paid programmatic API | **Not connected.** Seed dataset mirrors the taxonomy so a licensed feed replaces it 1:1. No scraping. |
| ExchangeRate-API (open endpoint) | FX rates | Free, keyless | **Wired.** Live fetch at startup, fallback to bundled snapshot (`src/data/currencies.ts`). |
| OpenStreetMap | Map tiles, coordinates | Free, attribution required | **Wired.** |
| Eurostat / OECD / World Bank | Country-level indicators | Free APIs | Documented, not wired in this build. |
| National statistical institutes | Country salaries, regional data | Free | Documented, not wired in this build. |

## How to plug in a real provider

Create a module in `src/data/` that exports `City[]` (same shape as the seed file) —
for example `cities.numbeo.ts` calling your licensed Numbeo API through a **server-side
proxy** (never embed the key in client code), then re-point imports. Stats fields that
have no source should be omitted (`undefined`), not zero; the UI renders them as
unavailable.

Suggested server-side proxy (Vercel function sketch — keep secrets server-side):

```ts
const KEY = process.env.NUMBEO_API_KEY
export default async function handler(_req, res) {
  const r = await fetch(`https://www.numbeo.com/api/city_prices?api_key=${KEY}&query=Turin`)
  res.status(200).json(await r.json())
}
```

## Confidence levels

- **HIGH** — official or well-documented data with strong coverage.
- **MEDIUM** — reliable aggregated or crowdsourced data with sufficient observations.
- **LOW** — limited observations, dated information or approximations. The seed dataset
  is LOW until replaced; a visible warning tells users to verify before deciding.

## Never-invent rule

No value may be fabricated to fill a gap. If live data is unavailable:

1. the UI marks the datum as unavailable,
2. editable example values, when present, are labelled *illustrative*,
3. users can enter their own figures,
4. mock data is never presented as real-time.
