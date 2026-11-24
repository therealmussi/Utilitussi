import { useMemo, useState } from 'react'
import { Save, Info, Printer, PencilLine } from 'lucide-react'
import { CITIES, cityById, CATEGORY_LABELS, CATEGORY_ORDER } from '../data/cities'
import type { ExpenseCategory } from '../types'
import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import {
  applyLifestyle,
  requiredSalary,
  disposableIncome,
  compareOutcome,
  pctDifference,
  annualise,
  type CategoryOverride,
  type CostEstimate,
} from '../lib/finance'
import { convert, formatMoney, formatPct, parseAmount } from '../lib/currency'
import {
  Card,
  Button,
  Select,
  Field,
  Input,
  Banner,
  StatCard,
  OutcomeBadge,
  SourceNote,
} from '../components/ui'

const SLIDER_STEPS = [2000, 2500, 3000, 3500, 4000, 5000]

export default function SalarySimulator() {
  const store = useAppStore()
  const [fromCityId, setFromCityId] = useState(store.homeCityId)
  const [toCityId, setToCityId] = useState('geneva')
  const [netSalary, setNetSalary] = useState(2500)
  const [currentRentRaw, setCurrentRentRaw] = useState('')
  const [customize, setCustomize] = useState(false)
  const [destOverrides, setDestOverrides] = useState<CategoryOverride[]>([])
  const [savedMsg, setSavedMsg] = useState(false)

  const profile = LIFESTYLE_PROFILES[store.lifestyleId]
  const from = cityById(fromCityId)
  const to = cityById(toCityId)
  const display = store.displayCurrency
  const rates = store.rates

  const currentRent = currentRentRaw.trim() === '' ? null : parseAmount(currentRentRaw)
  const currentOverrides = useMemo<CategoryOverride[]>(
    () => (currentRent != null ? [{ category: 'accommodation', value: currentRent }] : []),
    [currentRent],
  )

  const currentEst: CostEstimate | null = from ? applyLifestyle(from, profile, currentOverrides) : null
  const destEst: CostEstimate | null = to ? applyLifestyle(to, profile, destOverrides) : null

  const currentTotal = currentEst && from ? convert(currentEst.total, from.currency, display, rates) : 0
  const destTotal = destEst && to ? convert(destEst.total, to.currency, display, rates) : 0

  const required = requiredSalary(netSalary, currentTotal, destTotal)
  const currentDisposable = disposableIncome(netSalary, currentTotal)
  const destDisposable = disposableIncome(netSalary, destTotal)
  const pct = pctDifference(currentDisposable, destDisposable)
  const outcome = compareOutcome(netSalary, currentTotal, netSalary, destTotal)

  const setOverrideFor = (cat: ExpenseCategory, raw: string) => {
    setDestOverrides((prev) => {
      const filtered = prev.filter((o) => o.category !== cat)
      if (raw.trim() === '') return filtered
      return [...filtered, { category: cat, value: parseAmount(raw) }]
    })
  }
  const overrideValue = (cat: ExpenseCategory) =>
    destOverrides.find((o) => o.category === cat)?.value?.toString() ?? ''

  const costDiffDisplay = (cat: ExpenseCategory) => {
    if (!currentEst || !destEst || !from || !to) return { a: 0, b: 0 }
    return {
      a: convert(currentEst.breakdown[cat], from.currency, display, rates),
      b: convert(destEst.breakdown[cat], to.currency, display, rates),
    }
  }

  const saveSim = () => {
    if (!from || !to) return
    store.addSimulation({
      fromCityId: from.id,
      toCityId: to.id,
      netSalary,
      lifestyleId: store.lifestyleId,
      requiredSalary: Math.round(required),
      outcome: outcome.outcome,
      displayCurrency: display,
    })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  const invalid = netSalary <= 0 || !from || !to

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-h1">⇄ Salary Simulator</h1>
          <p className="mt-1 max-w-2xl text-sm muted">
            How much net salary would you need in the destination to keep the same lifestyle? Amounts in {display}.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" size="sm" onClick={saveSim} disabled={invalid}>
            <Save size={13} /> Save simulation
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print / PDF
          </Button>
        </div>
      </header>

      {savedMsg && <Banner tone="success">Simulation saved — see it on the Overview dashboard.</Banner>}

      <Card title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Current city">
            <Select value={fromCityId} onChange={(e) => setFromCityId(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country} ({c.currency})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Destination city">
            <Select value={toCityId} onChange={(e) => setToCityId(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country} ({c.currency})
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Current monthly net salary (${display})`} hint="Net income, already after taxes.">
            <Input
              type="number"
              min={0}
              value={Number.isFinite(netSalary) ? netSalary : ''}
              onChange={(e) => setNetSalary(parseAmount(e.target.value))}
            />
          </Field>
          <Field label="Lifestyle profile" hint={`Applied to both cities. Change it in Settings or below.`}>
            <Select value={store.lifestyleId} onChange={(e) => store.setLifestyleId(e.target.value as typeof store.lifestyleId)}>
              {Object.values(LIFESTYLE_PROFILES).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Your actual current rent (optional)">
            <Input
              type="number"
              min={0}
              placeholder={from ? `${from.housing.outside1bed.value} ${from.currency} default` : ''}
              value={currentRentRaw}
              onChange={(e) => setCurrentRentRaw(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button variant={customize ? 'primary' : 'secondary'} className="w-full" onClick={() => setCustomize((c) => !c)}>
              <PencilLine size={14} /> {customize ? 'Hide basket editor' : 'Customize destination basket'}
            </Button>
          </div>
        </div>

        {customize && destEst && to && (
          <div className="mt-4">
            <p className="mb-2 text-xs muted">
              Override any category with your real expected expense (in <b>{to.currency}</b>). Empty fields keep the
              profile estimate.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORY_ORDER.map((cat) => (
                <Field
                  key={cat}
                  label={`${CATEGORY_LABELS[cat]} (${to.currency})`}
                  hint={destEst.overridden.includes(cat) ? 'custom' : undefined}
                >
                  <Input
                    type="number"
                    min={0}
                    placeholder={Math.round(destEst.breakdown[cat]).toString()}
                    value={overrideValue(cat)}
                    onChange={(e) => setOverrideFor(cat, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>
        )}
      </Card>

      {invalid ? (
        <Banner tone="warning">Enter a positive net salary to compute the equivalence.</Banner>
      ) : currentEst && destEst ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Current monthly costs" value={formatMoney(currentTotal, display)} sub={`${from?.name} · ${profile.label}`} />
            <StatCard label="Destination monthly costs" value={formatMoney(destTotal, display)} sub={`${to?.name} · ${profile.label}`} />
            <StatCard
              label="Equivalent required salary"
              value={formatMoney(required, display)}
              sub="net, per month, to keep the same lifestyle ratio"
              tone="accent"
            />
            <StatCard
              label="Outcome at your current salary"
              value={formatPct(pct, { signed: true })}
              sub={`disposable income ${formatMoney(destDisposable, display)} vs ${formatMoney(currentDisposable, display)}`}
              tone={outcome.outcome === 'better' ? 'positive' : outcome.outcome === 'worse' ? 'negative' : 'warning'}
            />
          </section>

          <Card title="Results">
            <div className="flex flex-wrap items-center gap-4">
              <OutcomeBadge outcome={outcome.outcome}>
                {outcome.outcome === 'better'
                  ? 'Financially better off'
                  : outcome.outcome === 'worse'
                    ? 'Financially worse off'
                    : 'Approximately equivalent'}
              </OutcomeBadge>
              <p className="text-sm muted">
                Estimated monthly savings in {to?.name} at your current salary:{' '}
                <b className={destDisposable >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatMoney(destDisposable, display)}
                </b>{' '}
                ({formatMoney(annualise(destDisposable), display)} per year).
              </p>
            </div>

            <div className="mt-5">
              <label className="field-label">Salary slider — outcome at different salaries in {to?.name} (net, {display})</label>
              <div className="grid gap-2 sm:grid-cols-6">
                {SLIDER_STEPS.map((step) => {
                  const r = compareOutcome(step, currentTotal, step, destTotal)
                  const net = step - destTotal
                  return (
                    <button
                      key={step}
                      onClick={() => setNetSalary(step)}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${
                        netSalary === step ? 'border-accent-strong bg-accent-soft' : 'border-slate-200 dark:border-ink-700'
                      }`}
                    >
                      <span className="block text-sm font-bold">{formatMoney(step, display)}</span>
                      <span className={`block text-[11px] font-semibold ${net >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {net >= 0 ? '+' : ''}
                        {formatMoney(net, display)} saved
                      </span>
                      <span className="block text-[10px] muted">{r.outcome}</span>
                    </button>
                  )
                })}
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(10000, Math.round(required * 2))}
                step={100}
                value={Math.min(netSalary, Math.max(10000, Math.round(required * 2)))}
                onChange={(e) => setNetSalary(parseAmount(e.target.value))}
                className="mt-4 w-full accent-accent-strong"
                aria-label="Salary slider"
              />
            </div>
          </Card>

          <Card title="Line-by-line equivalence" subtitle={`Both baskets in ${display}`} className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">{from?.name}</th>
                  <th className="py-2 pr-3">{to?.name}</th>
                  <th className="py-2 pr-3">Δ</th>
                  <th className="py-2 pr-3">%</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map((cat) => {
                  const { a, b } = costDiffDisplay(cat)
                  return (
                    <tr key={cat} className="border-b border-slate-50 dark:border-ink-800/60">
                      <td className="py-2 pr-3">{CATEGORY_LABELS[cat]}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatMoney(a, display)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatMoney(b, display)}</td>
                      <td className={`py-2 pr-3 tabular-nums ${b - a > 0 ? 'text-negative' : 'text-positive'}`}>
                        {formatMoney(b - a, display)}
                      </td>
                      <td className={`py-2 pr-3 tabular-nums ${b - a > 0 ? 'text-negative' : 'text-positive'}`}>
                        {formatPct(pctDifference(a, b), { signed: true })}
                      </td>
                    </tr>
                  )
                })}
                <tr className="font-extrabold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3 tabular-nums">{formatMoney(currentTotal, display)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatMoney(destTotal, display)}</td>
                  <td className={`py-2 pr-3 tabular-nums ${destTotal - currentTotal > 0 ? 'text-negative' : 'text-positive'}`}>
                    {formatMoney(destTotal - currentTotal, display)}
                  </td>
                  <td className={`py-2 pr-3 tabular-nums ${destTotal - currentTotal > 0 ? 'text-negative' : 'text-positive'}`}>
                    {formatPct(pctDifference(currentTotal, destTotal), { signed: true })}
                  </td>
                </tr>
              </tbody>
            </table>
            <SourceNote source={destEst ? to?.source : undefined} link={to?.verifyUrl} />
          </Card>

          <Banner tone="info">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Info size={13} /> Methodology
            </span>
            <p className="mt-1">
              Required salary = current net salary × (destination basket ÷ current basket). This is a{' '}
              <b>net-to-net cost-of-living comparison, not a gross-to-net tax calculation</b>: it assumes net incomes and
              does not model destination income tax, social contributions or country-specific payroll deductions.
              Currency conversion uses a single FX reference ({rates.live ? 'live' : 'static fallback'}, {rates.referenceDate});
              it is not purchasing-power parity. Seed statistics are illustrative — override categories with your real
              expenses for a meaningful result.
            </p>
          </Banner>
        </>
      ) : null}
    </div>
  )
}
