import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Scale,
  Calculator,
  Plane,
  Globe2,
  Wallet,
  ArrowRight,
  Coins,
  Home,
  TrendingUp,
  PiggyBank,
} from 'lucide-react'
import { CITIES, cityById } from '../data/cities'
import { Card, StatCard, Flag, SourceNote, EmptyState, Button } from '../components/ui'
import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import { applyLifestyle } from '../lib/finance'
import { convert, formatMoney } from '../lib/currency'
import { financialInsight } from '../lib/insight'

export default function Overview() {
  const store = useAppStore()
  const home = cityById(store.homeCityId) ?? CITIES[0]
  const profile = LIFESTYLE_PROFILES[store.lifestyleId]
  const navigate = useNavigate()

  const estimate = useMemo(() => applyLifestyle(home, profile), [home, profile])
  const totalDisplay = convert(estimate.total, home.currency, store.displayCurrency, store.rates)
  const rentDisplay = convert(
    home.housing[profile.housing.base].value,
    home.currency,
    store.displayCurrency,
    store.rates,
  )
  const ppp = home.indices.localPurchasingPower
  const salary = home.averageNetSalary
  const salaryDisplay = salary
    ? convert(salary.value, home.currency, store.displayCurrency, store.rates)
    : null
  const savingsMonthly = salaryDisplay != null ? salaryDisplay - totalDisplay : null

  const featured = useMemo(() => {
    const picks = ['geneva', 'new-york', 'montreal', 'london', 'barcelona', 'tokyo']
    return picks
      .map((id) => cityById(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        city: c,
        total: convert(applyLifestyle(c, profile).total, c.currency, store.displayCurrency, store.rates),
      }))
      .sort((a, b) => a.total - b.total)
  }, [profile, store.displayCurrency, store.rates])

  const insights = useMemo(
    () => financialInsight(home, store.displayCurrency, store.rates, store.lifestyleId),
    [home, store.displayCurrency, store.rates, store.lifestyleId],
  )

  const quickActions = [
    { to: '/compare', label: 'Compare two cities', desc: 'Side-by-side costs, up to four', icon: Scale },
    { to: '/salary', label: 'Calculate required salary', desc: 'Keep your lifestyle abroad', icon: Calculator },
    { to: '/relocation', label: 'Simulate relocation', desc: 'First months, break-even', icon: Plane },
    { to: '/explorer', label: 'Explore global costs', desc: 'Map, profiles, indices', icon: Globe2 },
  ]

  return (
    <div className="space-y-6">
      <section className="panel panel-pad bg-gradient-to-br from-ink-900 via-ink-900 to-ink-850">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-strong">Life Cost Simulator</p>
        <h1 className="mt-2 heading-h1">Know what your life really costs.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed muted">
          Compare lifestyles — not just prices. Model your monthly basket in {CITIES.length} world cities, simulate
          salary moves, build budgets and evaluate a relocation before you commit to it.
        </p>
        <div className="mt-4">
          <label className="field-label">Your reference city</label>
          <select
            value={home.id}
            onChange={(e) => store.setHomeCityId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-850 dark:text-slate-100"
            aria-label="Reference city for dashboard indicators"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly living costs"
          value={formatMoney(totalDisplay, store.displayCurrency)}
          sub={`${home.name} · ${profile.label} profile`}
          icon={<Wallet size={15} />}
        />
        <StatCard
          label="Average rent"
          value={formatMoney(rentDisplay, store.displayCurrency)}
          sub={
            profile.housing.base === 'centre1bed'
              ? '1-bed, city centre'
              : profile.housing.multiplier < 1
                ? 'shared 1-bed, outside centre'
                : '1-bed, outside centre'
          }
          icon={<Home size={15} />}
        />
        <StatCard
          label="Purchasing power"
          value={ppp != null ? ppp.toFixed(0) : '—'}
          sub={ppp != null ? 'local index · 100 ≈ New York level' : 'not available'}
          tone={ppp != null && ppp >= 100 ? 'positive' : ppp != null ? 'warning' : 'neutral'}
          icon={<TrendingUp size={15} />}
        />
        <StatCard
          label="Est. monthly savings"
          value={savingsMonthly != null ? formatMoney(savingsMonthly, store.displayCurrency) : '—'}
          sub={salaryDisplay != null ? 'illustrative average net salary − basket' : 'no salary data'}
          tone={savingsMonthly != null ? (savingsMonthly >= 0 ? 'positive' : 'negative') : 'neutral'}
          icon={<PiggyBank size={15} />}
        />
      </section>

      <Card title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ to, label, desc, icon: Icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft dark:border-ink-700"
            >
              <span className="rounded-lg bg-accent-soft p-2 text-accent-strong">
                <Icon size={16} />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span>
                <span className="block text-xs muted">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          title="Featured cities"
          subtitle={`Estimated monthly cost · ${profile.label} profile · ${store.displayCurrency}`}
          className="lg:col-span-3"
        >
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {featured.map(({ city, total }) => (
              <li key={city.id}>
                <Link
                  to={`/explorer/${city.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-accent-strong"
                >
                  <Flag code={city.countryCode} size="text-xl" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{city.name}</span>
                    <span className="block text-xs muted">{city.country}</span>
                  </span>
                  {city.indices.costOfLiving != null && (
                    <span className="hidden text-xs muted sm:block">COL index {city.indices.costOfLiving}</span>
                  )}
                  <span className="text-sm font-bold tabular-nums">{formatMoney(total, store.displayCurrency)}</span>
                  <ArrowRight size={14} className="text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
          <SourceNote source={home.source} link={home.verifyUrl} />
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Recent simulations" subtitle="Stored locally in your browser">
            {store.recentSimulations.length === 0 ? (
              <EmptyState
                icon={<Coins size={28} />}
                title="No simulations yet"
                body="Run the Salary Simulator to see your recent comparisons here."
                action={
                  <Button onClick={() => navigate('/salary')} size="sm">
                    Open Salary Simulator
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {store.recentSimulations.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-ink-800"
                  >
                    <span>
                      <span className="font-semibold">
                        {cityById(s.fromCityId)?.name} → {cityById(s.toCityId)?.name}
                      </span>
                      <span className="block muted">
                        needs {formatMoney(s.requiredSalary, s.displayCurrency)} net · {s.lifestyleId}
                      </span>
                    </span>
                    <span
                      className={
                        s.outcome === 'better'
                          ? 'font-bold text-positive'
                          : s.outcome === 'worse'
                            ? 'font-bold text-negative'
                            : 'font-bold text-warning'
                      }
                    >
                      {s.outcome}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Financial insight" subtitle="Generated from the dataset you currently have loaded">
            <ul className="space-y-3">
              {insights.map((s, i) => (
                <li key={i} className="border-l-2 border-accent/50 pl-3 text-sm leading-relaxed">
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
