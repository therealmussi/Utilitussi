import { Sun, Moon, Database, Trash2, ShieldAlert } from 'lucide-react'
import { CITIES } from '../data/cities'
import { SUPPORTED_CURRENCIES } from '../data/currencies'
import { LIFESTYLE_LIST } from '../data/lifestyle'
import { useAppStore } from '../store/useAppStore'
import { Card, Button, Select, Field, Banner } from '../components/ui'

export default function Settings() {
  const store = useAppStore()
  const rates = store.rates

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-h1">⚙ Settings</h1>
        <p className="mt-1 text-sm muted">Preferences are stored locally in your browser only.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Appearance">
          <Field label="Theme">
            <div className="flex gap-2">
              <Button variant={store.theme === 'dark' ? 'primary' : 'secondary'} onClick={() => store.setTheme('dark')}>
                <Moon size={14} /> Dark
              </Button>
              <Button variant={store.theme === 'light' ? 'primary' : 'secondary'} onClick={() => store.setTheme('light')}>
                <Sun size={14} /> Light
              </Button>
            </div>
          </Field>
        </Card>

        <Card title="Currency & lifestyle">
          <div className="grid gap-3">
            <Field label="Display currency" hint="All cities convert to this currency with one shared FX reference date.">
              <Select
                value={store.displayCurrency}
                onChange={(e) => store.setDisplayCurrency(e.target.value as typeof store.displayCurrency)}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default lifestyle profile" hint={LIFESTYLE_LIST.find((p) => p.id === store.lifestyleId)?.description}>
              <Select value={store.lifestyleId} onChange={(e) => store.setLifestyleId(e.target.value as typeof store.lifestyleId)}>
                {LIFESTYLE_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reference city" hint="Drives the Overview dashboard indicators.">
              <Select value={store.homeCityId} onChange={(e) => store.setHomeCityId(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Exchange rates" subtitle="One FX reference for every comparison in the app">
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span>Status</span>
              <span className={rates.live ? 'font-bold text-positive' : 'font-bold text-warning'}>
                {rates.live ? 'Live fetch active' : 'Static bundled snapshot'}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Reference date</span>
              <b>{rates.referenceDate}</b>
            </li>
            <li className="flex justify-between">
              <span>Provider</span>
              <b className="text-right">{rates.provider}</b>
            </li>
          </ul>
          <div className="mt-3">
            <Banner tone="info">
              Currency conversion is arithmetic at one moment in time. It is <b>not purchasing-power parity</b>: 500 CHF in
              Geneva buys a different life than 500 CHF converted to EUR. Use the lifestyle baskets for real comparisons.
            </Banner>
          </div>
        </Card>

        <Card title="Data sources" subtitle="What this application uses, and its limits">
          <ul className="space-y-2 text-sm leading-relaxed">
            <li className="flex gap-2">
              <Database size={15} className="mt-0.5 shrink-0 text-accent-strong" />
              <span>
                <b>Numbeo</b> — taxonomy and city indices. Programmatic API access is paid; this build therefore ships an{' '}
                <b>illustrative seed dataset</b> (marked LOW confidence), with structured fields ready for a licensed feed.
              </span>
            </li>
            <li className="flex gap-2">
              <Database size={15} className="mt-0.5 shrink-0 text-accent-strong" />
              <span>
                <b>Eurostat / OECD / World Bank</b> — reference sources for country-level indicators; not wired live in
                this build.
              </span>
            </li>
            <li className="flex gap-2">
              <Database size={15} className="mt-0.5 shrink-0 text-accent-strong" />
              <span>
                <b>OpenStreetMap</b> — map tiles and geodata (attribution shown on the map).
              </span>
            </li>
            <li className="flex gap-2">
              <Database size={15} className="mt-0.5 shrink-0 text-accent-strong" />
              <span>
                <b>ExchangeRate-API open endpoint</b> — free, keyless FX rates with automatic fallback to the bundled
                snapshot.
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs muted">
            See <code>docs/data-sources.md</code> for how to plug in real providers without touching UI code. No API keys
            live in frontend code; configure any paid provider via <code>.env</code> (template in <code>.env.example</code>)
            and a server-side proxy.
          </p>
        </Card>

        <Card title="Local data" subtitle="Simulations, comparisons, budgets, relocation scenarios and favourites">
          <p className="text-sm muted">
            {store.recentSimulations.length} simulations · {store.savedComparisons.length} comparisons ·{' '}
            {store.savedBudgets.length} budgets · {store.savedRelocations.length} relocation scenarios
          </p>
          <div className="mt-3">
            <Banner tone="warning">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ShieldAlert size={13} /> Destructive action
              </span>{' '}
              — this cannot be undone.
            </Banner>
          </div>
          <Button
            variant="danger"
            className="mt-3"
            onClick={() => {
              if (window.confirm('Delete all locally saved data (favourites, simulations, budgets, scenarios)?')) {
                store.clearAllData()
              }
            }}
          >
            <Trash2 size={14} /> Clear all local data
          </Button>
        </Card>
      </div>
    </div>
  )
}
