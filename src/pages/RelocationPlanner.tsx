import { useMemo, useState } from 'react'
import { Save, Printer } from 'lucide-react'
import { CITIES, cityById } from '../data/cities'
import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import {
  applyLifestyle,
  disposableIncome,
  relocationInitialBudget,
  emergencyFundTarget,
  breakEvenMonths,
  SCENARIOS,
  DEFAULT_RELOCATION_ITEMS,
  type RelocationItemInput,
} from '../lib/finance'
import { convert, formatMoney } from '../lib/currency'
import { Card, Button, Select, Field, Input, StatCard, Banner, EmptyState, OutcomeBadge } from '../components/ui'

const HOUSEHOLDS = [
  { id: 'single', label: 'Single', factor: 1 },
  { id: 'couple', label: 'Couple (shared costs)', factor: 1.55 },
  { id: 'couple-child', label: 'Couple + one child', factor: 1.85 },
  { id: 'family', label: 'Family, 2+ children', factor: 2.2 },
]

function round(v: number): number {
  return Math.round(v * 100) / 100
}


export default function RelocationPlanner() {
  const store = useAppStore()
  const display = store.displayCurrency
  const rates = store.rates
  const profile = LIFESTYLE_PROFILES[store.lifestyleId]

  const [fromCityId, setFromCityId] = useState(store.homeCityId)
  const [toCityId, setToCityId] = useState('montreal')
  const [netIncome, setNetIncome] = useState(2500)
  const [household, setHousehold] = useState(HOUSEHOLDS[0])
  const [items, setItems] = useState<RelocationItemInput[]>(() => structuredClone(DEFAULT_RELOCATION_ITEMS))
  const [savedMsg, setSavedMsg] = useState(false)

  const from = cityById(fromCityId)
  const to = cityById(toCityId)
  const same = fromCityId === toCityId

  const fromEst = from ? applyLifestyle(from, profile) : null
  const toEst = to ? applyLifestyle(to, profile) : null

  const fromTotal = fromEst && from ? convert(fromEst.total, from.currency, display, rates) : 0
  const toTotalBase = toEst && to ? convert(toEst.total, to.currency, display, rates) : 0
  const toTotal = round(toTotalBase * household.factor)

  const currentDisposable = disposableIncome(netIncome, fromTotal)
  const destDisposable = disposableIncome(netIncome, toTotal)
  const monthlyGain = destDisposable - currentDisposable

  const scenarioBudget = (k: keyof typeof SCENARIOS) =>
    from && to ? convert(relocationInitialBudget(items, k), display, display, rates) : 0

  const scenarios = useMemo(
    () =>
      (['best', 'average', 'worst'] as const).map((k) => {
        const budget = scenarioBudget(k)
        return {
          key: k,
          label: SCENARIOS[k].label,
          budget,
          breakEven: breakEvenMonths(budget, Math.max(0, monthlyGain)),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, monthlyGain, from, to, display, rates],
  )

  const initial = scenarios.find((s) => s.key === 'average')!.budget
  const emergency = emergencyFundTarget(toTotal)

  const verdict: { tone: 'success' | 'warning' | 'error'; text: string }[] = []
  if (same) {
    verdict.push({ tone: 'warning', text: 'Origin and destination are the same city — pick a different destination city.' })
  }
  if (monthlyGain <= 0) {
    verdict.push({
      tone: 'error',
      text: `At your current net income of ${formatMoney(netIncome, display)}, the destination budget of ${formatMoney(
        toTotal,
        display,
      )} per month leaves no additional disposable income. The relocation is not financially sustainable without a higher salary.`,
    })
  } else {
    verdict.push({
      tone: 'success',
      text: `The move frees up about ${formatMoney(monthlyGain, display)} per month at the same net income.`,
    })
  }
  if (currentDisposable < 0) {
    verdict.push({
      tone: 'error',
      text: `Your current situation is already in deficit (${formatMoney(currentDisposable, display)} per month). Stabilise the origin budget first.`,
    })
  }
  verdict.push({
    tone: emergency >= 0 ? 'success' : 'warning',
    text: `Recommended emergency fund on arrival: 3 months of the destination basket ≈ ${formatMoney(emergency, display)}.`,
  })

  const setItem = (key: string, value: string) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, amount: Number(value.replace(/[^0-9.]/g, '')) || 0 } : it)))
  }
  const toggleStatus = (key: string) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, status: it.status === 'confirmed' ? 'estimated' : 'confirmed' } : it)),
    )
  }

  const save = () => {
    if (!from || !to) return
    store.addRelocation({
      fromCityId: from.id,
      toCityId: to.id,
      lifestyleId: store.lifestyleId,
      displayCurrency: display,
      initialBudget: Math.round(initial),
      destMonthlyCost: Math.round(toTotal),
      breakEvenMonths: scenarios[1].breakEven,
    })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  const confirmedCount = items.filter((i) => i.status === 'confirmed').length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-h1">✈ Relocation Planner</h1>
          <p className="mt-1 max-w-2xl text-sm muted">
            Five structured steps, from your current situation to a scenario-based final report. Currency: {display}.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" size="sm" onClick={save}>
            <Save size={13} /> Save scenario
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print / PDF
          </Button>
        </div>
      </header>

      {savedMsg && <Banner tone="success">Relocation scenario saved locally.</Banner>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Step 1 — Current situation">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current city">
              <Select value={fromCityId} onChange={(e) => setFromCityId(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Current net income (${display})`}>
              <Input
                type="number"
                min={0}
                value={netIncome}
                onChange={(e) => setNetIncome(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
              />
            </Field>
            <Field label="Household composition">
              <Select
                value={household.id}
                onChange={(e) => setHousehold(HOUSEHOLDS.find((h) => h.id === e.target.value) ?? HOUSEHOLDS[0])}
              >
                {HOUSEHOLDS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lifestyle profile" hint="Global preference — change it in Settings">
              <Select value={store.lifestyleId} onChange={(e) => store.setLifestyleId(e.target.value as typeof store.lifestyleId)}>
                {Object.values(LIFESTYLE_PROFILES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="mt-3 text-xs muted">
            Current estimated basket: <b>{formatMoney(fromTotal, display)}</b> per month · disposable income:{' '}
            <b className={currentDisposable >= 0 ? 'text-positive' : 'text-negative'}>{formatMoney(currentDisposable, display)}</b>{' '}
            · household factor ×{household.factor}.
          </p>
        </Card>

        <Card title="Step 2 — Destination">
          <Field label="Destination city">
            <Select value={toCityId} onChange={(e) => setToCityId(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </Select>
          </Field>
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-ink-800">
            <li className="flex justify-between py-2">
              <span>Monthly basket (your profile, household-adjusted)</span>
              <b className="tabular-nums">{formatMoney(toTotal, display)}</b>
            </li>
            <li className="flex justify-between py-2">
              <span>Minimum net salary to break even</span>
              <b className="tabular-nums text-accent-strong">
                {formatMoney(toTotal + Math.max(0, -currentDisposable), display)}
              </b>
            </li>
            <li className="flex justify-between py-2">
              <span>Disposable income after move</span>
              <b className={`tabular-nums ${destDisposable >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatMoney(destDisposable, display)}
              </b>
            </li>
          </ul>
        </Card>

        <Card
          title="Step 3 — Relocation costs"
          subtitle="Confirmed costs stay fixed in every scenario; estimated variable items scale"
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Amount ({display})</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Scenario behaviour</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.key} className="border-b border-slate-50 dark:border-ink-800/60">
                    <td className="py-2 pr-3">{it.label}</td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min={0}
                        className="w-28 text-right"
                        value={it.amount}
                        onChange={(e) => setItem(it.key, e.target.value)}
                        aria-label={it.label}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => toggleStatus(it.key)}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          it.status === 'confirmed' ? 'bg-positive-soft text-positive' : 'bg-warning-soft text-warning'
                        }`}
                      >
                        {it.status}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={it.variable ? 'text-accent-strong' : 'muted'}>{it.variable ? 'scales' : 'fixed'}</span>
                    </td>
                  </tr>
                ))}
                <tr className="font-extrabold">
                  <td className="py-2 pr-3">Initial relocation budget (expected)</td>
                  <td className="py-2 pr-3 tabular-nums" colSpan={3}>
                    {formatMoney(initial, display)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs muted">
            Deposit and first rent default to 0 — set them from real listings (typically 2–3 months of rent combined)
            before relying on the total.
          </p>
        </Card>

        <Card title="Step 4 — Financial simulation" subtitle="Expected scenario" className="lg:col-span-2">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Initial relocation budget" value={formatMoney(initial, display)} tone="warning" />
            <StatCard label="Monthly costs after moving" value={formatMoney(toTotal, display)} />
            <StatCard label="Required min. net salary" value={formatMoney(toTotal + Math.max(0, -currentDisposable), display)} sub="covers the basket + closes any current deficit" tone="accent" />
            <StatCard
              label="Break-even period"
              value={scenarios[1].breakEven != null ? `${scenarios[1].breakEven} months` : 'never'}
              sub="extra disposable income repaying the one-off budget"
              tone={scenarios[1].breakEven != null && scenarios[1].breakEven <= 24 ? 'positive' : 'negative'}
            />
          </section>
        </Card>

        <Card title="Step 5 — Final report" subtitle="Scenario analysis on the one-off costs" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                  <th className="py-2 pr-3">Scenario</th>
                  <th className="py-2 pr-3">One-off budget</th>
                  <th className="py-2 pr-3">Break-even</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.key} className="border-b border-slate-50 dark:border-ink-800/60">
                    <td className="py-2 pr-3 font-semibold">{s.label}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatMoney(s.budget, display)}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {s.breakEven != null ? `${s.breakEven} months` : 'the move never pays back for itself'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4">
            {verdict.map((v, i) => (
              <li key={i} className="mb-2">
                <OutcomeBadge outcome={v.tone === 'success' ? 'better' : v.tone === 'error' ? 'worse' : 'equivalent'}>
                  {v.tone}
                </OutcomeBadge>
                <span className="ml-2 text-sm leading-relaxed">{v.text}</span>
              </li>
            ))}
          </ul>
          <Banner tone="info">
            Confirmed items ({confirmedCount}) are held constant in all scenarios; estimated variable items scale between
            ×{SCENARIOS.best.multiplier} and ×{SCENARIOS.worst.multiplier}. Estimated items are marked as such — replace
            them with real quotes before signing anything.
          </Banner>
        </Card>
      </div>

      {(!to || !from) && <EmptyState title="Select cities" body="Choose origin and destination to run the simulation." />}
    </div>
  )
}
