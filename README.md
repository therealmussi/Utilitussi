# LIFE COST SIMULATOR

> **Know what your life really costs.**

An advanced international cost-of-living comparison platform: model your personal
lifestyle basket in world cities, simulate salary moves, build budgets and evaluate a
relocation before you commit to it.

The core principle: **compare lifestyles, not just prices.** A person earning €3,000
net in Turin and a person earning 5,000 CHF net in Geneva should not simply compare two
numbers.

---

## Features

| Section | What it does |
| --- | --- |
| **Overview** | Contextual KPIs for your reference city (living costs, rent, purchasing power, estimated savings), quick actions, featured cities, recent simulations, data-generated financial insight. |
| **City Explorer** | Interactive world map (Leaflet + OpenStreetMap), search with autocomplete, continent/country filters, favourites, sortable city list. |
| **City profile** | General info, economic indices, full 12-category monthly breakdown, housing (4 rent tiers), lifestyle prices, and an explicit data-quality section with verification links. |
| **Compare Cities** | 2–4 cities side by side: general indicators, per-category differences (absolute + %), bar/radar/pie charts, and a verdict generated strictly from the shown figures. |
| **Salary Simulator** | Net-to-net salary equivalence between cities, optional real-rent override, fully customizable destination basket, outcome badge (better/equivalent/worse), salary slider with instant updates, transparent methodology. |
| **Monthly Budget** | Full income/expense editor (7 groups), totals, disposable income, savings rate, annual view, distribution chart, multiple named saved budgets and a comparison view, CSV export, print/PDF. |
| **Relocation Planner** | 5-step wizard: current situation → destination → itemised one-off costs (confirmed vs estimated vs scenario-variable) → simulation (initial budget, monthly costs, minimum salary, break-even) → final report with best/expected/worst scenarios. |
| **Global Rankings** | Six indicators (cheapest/most expensive, rent extremes, purchasing power, salary-to-cost ratio), filters and explicit data-coverage statements. |
| **Settings** | Theme (dark/light), display currency, default lifestyle profile, reference city, FX status, data-source documentation, local-data management. |

Five **lifestyle profiles** — Student, Budget, Standard, Comfortable, Premium — tune
housing and every expense category, with fully editable basket overrides in the
simulator.

Cities included as a seed dataset: Turin, Milan, Paris, Lyon, Luxembourg, Geneva,
Zurich, London, Berlin, Amsterdam, Barcelona, Montréal, New York, Tokyo, Sydney,
Copenhagen.

---

## Tech stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS** (dark-first design system with light mode)
- **Recharts** for data visualisation
- **Leaflet / react-leaflet** with OpenStreetMap tiles
- **Zustand** (with `persist`) for state and local storage
- **Vitest** for automated tests of financial logic
- No backend required; no secrets in the client.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run test     # vitest, 34 automated tests (financial logic + full-route render smoke)
```

## Data model & architecture

```
src/
  data/            seed dataset + currencies + lifestyle profiles
    cities.ts      typed City records (indices, categories, housing, lifestyle, source)
    currencies.ts  supported currencies + bundled FX snapshot with reference date
    lifestyle.ts   lifestyle profile definitions (multipliers per category)
  lib/
    finance.ts     ALL monetary/budget math (no financial logic in components)
    currency.ts    conversion + live FX fetch with fallback
    rankings.ts    ranking metrics + estimate conversion
    insight.ts     data-derived narrative insights and verdicts
    export.ts      CSV export helper
  store/
    useAppStore.ts zustand store, persisted to localStorage
  components/      reusable UI system + layout/navigation
  pages/           one file per section
```

Every price point carries `value`, currency (via the city), category, source name,
reference date and a **confidence level** (`HIGH` / `MEDIUM` / `LOW`), rendered as a
visible badge. `docs/data-sources.md` explains how to plug in real providers.

## Calculation methodology (summary)

- **Salary equivalence** (net-to-net only, explicitly **not** a gross-to-net tax model):
  `required = currentNet × (destBasket / currentBasket)`.
- Lifestyle baskets = city category base values × profile multipliers; housing tier per
  profile; any category can be overridden by the user.
- All monetary values are rounded to cents at every step.
- Currency conversion uses **one FX reference for the whole comparison** and is never
  conflated with purchasing-power parity; conversion status (live/static) and reference
  date are always displayed.
- Relocation scenarios scale only the *variable* one-off items (best ×0.75 / expected
  ×1 / worst ×1.4); confirmed items never change.

Full details: [docs/methodology.md](docs/methodology.md).

## Data honesty rules

- No scraping. Numbeo's programmatic API is paid, so this build ships an **illustrative
  seed dataset**, labelled as such everywhere, with per-city verification links.
- The app **never presents mock data as live data**: every table/footer shows source,
  reference date and confidence; the FX widget shows live vs static status.
- Where a salary datum does not exist, the UI shows `—` instead of guessing.
- Users can override every category with their own figures.

## Environment variables

Copy `.env.example` to `.env` (optional — the app works with zero configuration):

| Variable | Purpose |
| --- | --- |
| `VITE_EXCHANGE_RATE_API_URL` | Optional mirror for the free, keyless exchange-rate endpoint. Do **not** put secret keys in `VITE_*` variables; proxy paid providers server-side. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Optional future backend for cloud accounts. Not required; local persistence is active by default. |

## User accounts

Accounts are not wired in this build. All user data (favourites, simulations,
comparisons, budgets, relocation scenarios, preferences) persists **locally in the
browser** via `localStorage`. The store layer is isolated so a Supabase adapter can be
added later without touching components (extend `src/store` and gate the provider in
`App.tsx`).

## Deployment (Vercel)

- Framework preset: **Vite**. Build command `npm run build`, output directory `dist`.
- SPA rewrites are provided in `vercel.json`.
- CI: `.github/workflows/ci.yml` runs lint, tests and the production build on every push
  and pull request.

## Known limitations

- Seed statistics are illustrative and carry LOW confidence until a licensed feed
  (Numbeo API, Eurostat, OECD, national statistical institutes) is connected.
- PDF export uses the browser print pipeline with a dedicated print stylesheet rather
  than a bundled PDF library; use "Save as PDF" from your browser dialog.
- Net salaries in the dataset are illustrative medians for a typical professional, not
  tax advice.
- Map tiles require internet access; the rest of the app degrades gracefully offline.

## License

See [LICENSE](LICENSE) — placeholder, all rights reserved until a license is chosen.

## Status

Built and verified in-session: **tests passing, oxlint clean, production build green,
preview server smoke-tested.** This application has not been deployed to a URL by the
author; deploy via Vercel (or any static host) with the commands above.
