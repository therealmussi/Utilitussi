import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Save, Printer } from 'lucide-react'
import { CITIES, CATEGORY_LABELS, CATEGORY_ORDER, cityById } from '../data/cities'
import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import { applyLifestyle, pctDifference } from '../lib/finance'
import { convert, formatMoney, formatPct } from '../lib/currency'
import { comparisonVerdict } from '../lib/insight'
import { Card, Button, Select, Flag, Banner, SourceNote } from '../components/ui'
import type { City } from '../types'

const SERIES_COLORS = ['#2dd4bf', '#818cf8', '#fbbf24', '#f87171']

function CityPicker({
  value,
  onChange,
  exclude,
  label,
}: {
  value: string
  onChange: (id: string) => void
  exclude: Array<string | number>
  label: string
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {CITIES.map((c) => (
        <option key={c.id} value={c.id} disabled={exclude.includes(c.id)}>
          {c.name}, {c.country}
        </option>
      ))}
    </Select>
  )
}

export default function Compare() {
  const store = useAppStore()
  const [ids, setIds] = useState<string[]>(['turin', 'geneva'])
  const profile = LIFESTYLE_PROFILES[store.lifestyleId]
  const rates = store.rates


  const estimates = useMemo(
    () =>
      ids
        .map((id) => cityById(id))
        .filter((c): c is City => Boolean(c))
        .map((city) => ({ city, est: applyLifestyle(city, profile) })),
    [ids, profile],
  )

  const display = store.displayCurrency
  const converted = useMemo(
    () =>
      estimates.map(({ city, est }) => ({
        city,
        breakdown: Object.fromEntries(
          CATEGORY_ORDER.map((cat) => [cat, convert(est.breakdown[cat], city.currency, display, rates)]),
        ) as Record<string, number>,
        total: convert(est.total, city.currency, display, rates),
      })),
    [estimates, display, rates],
  )

  const verdicts = useMemo(() => comparisonVerdict(estimates, display, rates), [estimates, display, rates])

  const barData = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => {
        const row: Record<string, string | number> = { category: CATEGORY_LABELS[cat] }
        converted.forEach((c, i) => {
          row[c.city.name] = Math.round(c.breakdown[cat])
          void i
        })
        return row
      }),
    [converted],
  )

  const radarData = useMemo(() => {
    const cats: (keyof typeof CATEGORY_LABELS)[] = ['accommodation', 'groceries', 'restaurants', 'transport', 'healthcare', 'leisure']
    return cats.map((cat) => {
      const row: Record<string, string | number> = { category: CATEGORY_LABELS[cat] }
      converted.forEach((c, i) => {
        const base = CATEGORY_ORDER.includes(cat)
        const v = base ? c.breakdown[cat] : 0
        // Normalise against the maximum across selected cities for readability
        const maxV = Math.max(...converted.map((x) => x.breakdown[cat] ?? 0))
        row[c.city.name] = maxV > 0 ? Math.round((v / maxV) * 100) : 0
        void i
      })
      return row
    })
  }, [converted])

  const pieCity = converted[0]

  const save = () => {
    store.addComparison({
      cityIds: ids,
      displayCurrency: display,
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-h1">Compare Cities</h1>
          <p className="mt-1 text-sm muted">2 to 4 cities, side by side. Switch cities below; all figures in {display}.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" size="sm" onClick={save}>
            <Save size={13} /> Save comparison
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print / PDF
          </Button>
        </div>
      </header>

      <Card title="Selection">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((slot) => {
            const isUsed = slot < ids.length
            return (
              <div key={slot}>
                <label className="field-label">City {String.fromCharCode(65 + slot)} {!isUsed && '(empty)'}</label>
                {isUsed ? (
                  <CityPicker
                    label={`City ${slot + 1}`}
                    value={ids[slot]}
                    exclude={[-1]}
                    onChange={(id) =>
                      setIds((prev) => {
                        const next = [...prev]
                        next[slot] = id
                        return next
                      })
                    }
                  />
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setIds((prev) => [...prev, 'london'])}
                    disabled={ids.length >= 4}
                  >
                    + Add city
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        {ids.length > 2 && (
          <button className="no-print mt-3 text-xs font-semibold text-negative hover:underline" onClick={() => setIds((p) => p.slice(0, -1))}>
            − Remove last city
          </button>
        )}
      </Card>

      {estimates.length < 2 ? (
        <Banner tone="warning">Select at least two different cities to compare.</Banner>
      ) : (
        <>
          <Card title="General comparison" subtitle="Indices and economic context" className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                  <th className="py-2 pr-3">Indicator</th>
                  {estimates.map(({ city }) => (
                    <th key={city.id} className="py-2 pr-3 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Flag code={city.countryCode} size="text-base" />
                        {city.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Country" cells={estimates.map((e) => e.city.country)} />
                <Row label="Currency" cells={estimates.map((e) => e.city.currency)} />
                <Row label="Population" cells={estimates.map((e) => (e.city.population ? e.city.population.toLocaleString('en-US') : '—'))} />
                <Row label="Cost-of-living index" cells={estimates.map((e) => e.city.indices.costOfLiving?.toFixed(1) ?? '—')} />
                <Row label="Rent index" cells={estimates.map((e) => e.city.indices.rent?.toFixed(1) ?? '—')} />
                <Row label="Purchasing power" cells={estimates.map((e) => e.city.indices.localPurchasingPower?.toFixed(1) ?? '—')} />
                <Row
                  label="Avg net salary (illustrative)"
                  cells={converted.map((c) => {
                    const c0 = estimates.find((e) => e.city.id === c.city.id)!
                    return c0.city.averageNetSalary
                      ? formatMoney(convert(c0.city.averageNetSalary.value, c0.city.currency, display, rates), display)
                      : '—'
                  })}
                />
                <Row label="Total monthly basket" cells={converted.map((c) => formatMoney(c.total, display))} bold />
              </tbody>
            </table>
          </Card>

          <Card title="Expense comparison" subtitle={`${profile.label} profile · monthly · differences computed vs the first selected city`} className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                  <th className="py-2 pr-3">Category</th>
                  {converted.map((c) => (
                    <th key={c.city.id} className="py-2 pr-3 font-semibold">{c.city.name}</th>
                  ))}
                  <th className="py-2 pr-3 font-semibold">Difference</th>
                  <th className="py-2 pr-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map((cat) => {
                  const values = converted.map((c) => c.breakdown[cat])
                  const diff = values[values.length - 1] - values[0]
                  const pct = pctDifference(values[0], values[values.length - 1])
                  return (
                    <tr key={cat} className="border-b border-slate-50 dark:border-ink-800/60">
                      <td className="py-2 pr-3">{CATEGORY_LABELS[cat]}</td>
                      {values.map((v, i) => (
                        <td key={i} className="py-2 pr-3 tabular-nums">{formatMoney(v, display)}</td>
                      ))}
                      <td className={`py-2 pr-3 tabular-nums font-semibold ${diff > 0 ? 'text-negative' : diff < 0 ? 'text-positive' : ''}`}>
                        {formatMoney(Math.abs(diff), display)} {diff >= 0 ? 'more in last' : 'less in last'}
                      </td>
                      <td className={`py-2 pr-3 tabular-nums ${pct > 0 ? 'text-negative' : 'text-positive'}`}>
                        {formatPct(pct, { signed: true })}
                      </td>
                    </tr>
                  )
                })}
                {(() => {
                  const diff = converted[converted.length - 1].total - converted[0].total
                  const pct = pctDifference(converted[0].total, converted[converted.length - 1].total)
                  return (
                    <tr className="font-extrabold">
                      <td className="py-2 pr-3">Total</td>
                      {converted.map((c) => (
                        <td key={c.city.id} className="py-2 pr-3 tabular-nums">{formatMoney(c.total, display)}</td>
                      ))}
                      <td className={`py-2 pr-3 tabular-nums ${diff > 0 ? 'text-negative' : 'text-positive'}`}>
                        {formatMoney(Math.abs(diff), display)}
                      </td>
                      <td className={`py-2 pr-3 tabular-nums ${pct > 0 ? 'text-negative' : 'text-positive'}`}>
                        {formatPct(pct, { signed: true })}
                      </td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>
            <SourceNote source={estimates[0].city.source} link={estimates[0].city.verifyUrl} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Category comparison" subtitle="Monthly cost per category (bar chart)">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ bottom: 40 }}>
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip formatter={(v) => formatMoney(Number(v), display)} />
                    <Legend />
                    {converted.map((c, i) => (
                      <Bar key={c.city.id} dataKey={c.city.name} fill={SERIES_COLORS[i % 4]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Relative profile" subtitle="Normalised to 100 = most expensive of the selection, per category">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    {converted.map((c, i) => (
                      <Radar key={c.city.id} dataKey={c.city.name} stroke={SERIES_COLORS[i % 4]} fill={SERIES_COLORS[i % 4]} fillOpacity={0.18} />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {pieCity && (
            <Card title={`Cost distribution — ${pieCity.city.name}`} subtitle="Share of the monthly basket">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CATEGORY_ORDER.filter((c) => pieCity.breakdown[c] > 0).map((c) => ({ name: CATEGORY_LABELS[c], value: Math.round(pieCity.breakdown[c]) }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={1}
                    >
                      {CATEGORY_ORDER.map((_, i) => (
                        <Cell key={i} fill={[ '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fbbf24', '#fb923c', '#f87171', '#a3e635', '#34d399', '#94a3b8', '#cbd5e1'][i % 12]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v) => formatMoney(Number(v), display)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Overall verdict" subtitle="Generated from the figures shown above">
            <ul className="space-y-2">
              {verdicts.map((v, i) => (
                <li key={i} className="border-l-2 border-accent/50 pl-3 text-sm leading-relaxed">{v}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function Row({ label, cells, bold }: { label: string; cells: (string | number)[]; bold?: boolean }) {
  return (
    <tr className={`border-b border-slate-50 dark:border-ink-800/60 ${bold ? 'font-extrabold' : ''}`}>
      <td className="py-2 pr-3">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-3 tabular-nums">{c}</td>
      ))}
    </tr>
  )
}
