import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import { CITIES, CONTINENTS, COUNTRIES } from '../data/cities'
import type { Continent, CurrencyCode } from '../types'
import { useAppStore } from '../store/useAppStore'
import { RANKING_METRICS } from '../lib/rankings'
import { formatNumber } from '../lib/currency'
import { Card, Select, Flag, Banner, SourceNote } from '../components/ui'

export default function Rankings() {
  const store = useAppStore()
  const display = store.displayCurrency
  const rates = store.rates
  const [metricId, setMetricId] = useState('cheapest')
  const [continent, setContinent] = useState<Continent | ''>('')
  const [country, setCountry] = useState('')
  const [minPop, setMinPop] = useState(0)
  const [ascending, setAscending] = useState<boolean | null>(null)

  const metric = RANKING_METRICS.find((m) => m.id === metricId) ?? RANKING_METRICS[0]

  const ranked = useMemo(() => {
    const rows = CITIES.filter((c) => {
      if (continent && c.continent !== continent) return false
      if (country && c.country !== country) return false
      if (minPop && (!c.population || c.population < minPop)) return false
      if (metric.requiresSalary && !c.averageNetSalary) return false
      return true
    })
      .map((c) => ({ city: c, value: metric.value(c, display, rates) }))
      .filter((r): r is { city: (typeof CITIES)[number]; value: number } => r.value != null)

    const natural: 'asc' | 'desc' = metric.higherIsBetter ? 'desc' : 'asc'
    const dir = ascending === null ? natural : ascending ? 'asc' : 'desc'
    return rows.sort((a, b) => (dir === 'desc' ? b.value - a.value : a.value - b.value))
  }, [metric, continent, country, minPop, display, rates, ascending])

  const coverage = `${ranked.length}/${CITIES.length} cities cover this indicator`

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-h1">🏆 Global Rankings</h1>
        <p className="mt-1 text-sm muted">
          Explore cities by the indicator you care about. Every ranking states exactly what it measures and how much data
          coverage it has.
        </p>
      </header>

      <Card title="Ranking">
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={metricId}
            onChange={(e) => {
              setMetricId(e.target.value)
              setAscending(null)
            }}
            aria-label="Ranking indicator"
          >
            {RANKING_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select value={continent} onChange={(e) => setContinent(e.target.value as Continent | '')} aria-label="Continent filter">
            <option value="">All continents</option>
            {CONTINENTS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country filter">
            <option value="">All countries</option>
            {COUNTRIES.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Select value={minPop} onChange={(e) => setMinPop(Number(e.target.value))} aria-label="Population filter">
            <option value={0}>Any population</option>
            <option value={500000}>500k +</option>
            <option value={1000000}>1M +</option>
            <option value={3000000}>3M +</option>
          </Select>
        </div>
        <div className="mt-3">
          <Banner tone="info">
            <b>{metric.description}</b> Coverage: {coverage}. Filters: {continent || 'all continents'} ·{' '}
            {country || 'all countries'} · population {minPop ? `≥ ${formatNumber(minPop)}` : 'any'}.
          </Banner>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide muted dark:border-ink-800">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Population</th>
                <th className="py-2 pr-3">
                  {metric.label}
                  <button
                    onClick={() => setAscending((a) => (a === null ? !(metric.higherIsBetter ? false : true) : !a))}
                    aria-label="Toggle sort direction"
                    className="ml-1 text-accent-strong"
                    title="Toggle sort direction"
                  >
                    <ArrowUpDown size={12} className="inline" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.city.id} className="border-b border-slate-50 dark:border-ink-800/60">
                  <td className="py-2 pr-3 font-bold muted">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <Link to={`/explorer/${r.city.id}`} className="inline-flex items-center gap-2 font-semibold hover:text-accent-strong">
                      <Flag code={r.city.countryCode} size="text-base" />
                      {r.city.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{r.city.country}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.city.population ? formatNumber(r.city.population) : '—'}</td>
                  <td className="py-2 pr-3 font-bold tabular-nums">{metric.format(r.value, display as CurrencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceNote source={CITIES[0].source} link={CITIES[0].verifyUrl} />
      </Card>
    </div>
  )
}
