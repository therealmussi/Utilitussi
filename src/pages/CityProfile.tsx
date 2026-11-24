import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Printer } from 'lucide-react'
import { cityById, CATEGORY_LABELS, CATEGORY_ORDER, HOUSING_LABELS } from '../data/cities'

import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import { applyLifestyle } from '../lib/finance'
import { convert, formatMoney, formatNumber } from '../lib/currency'
import type { HousingKey } from '../types'
import {
  Card,
  Flag,
  SourceNote,
  ConfidenceBadge,
  StatCard,
  EmptyState,
} from '../components/ui'

export default function CityProfile() {
  const { cityId } = useParams()
  const city = cityById(cityId ?? '')
  const store = useAppStore()
  const profile = LIFESTYLE_PROFILES[store.lifestyleId]
  const fav = city ? store.favourites.includes(city.id) : false

  const estimate = useMemo(
    () => (city ? applyLifestyle(city, profile) : null),
    [city, profile],
  )

  if (!city) {
    return <EmptyState title="City not found" body="This city id does not exist in the loaded dataset." action={<Link to="/explorer"><ArrowLeft size={14} className="inline" /> Back to the Explorer</Link>} />
  }

  const fmt = (v: number, opts?: { compact?: boolean }) => formatMoney(convert(v, city.currency, store.displayCurrency, store.rates), store.displayCurrency, opts)
  const fmtLocal = (v: number) => formatMoney(v, city.currency)

  const indices = Object.entries(city.indices).filter(([, v]) => v != null) as [string, number][]
  const indexLabels: Record<string, string> = {
    costOfLiving: 'Cost of Living Index',
    rent: 'Rent Index',
    groceries: 'Grocery Index',
    restaurants: 'Restaurant Price Index',
    localPurchasingPower: 'Local Purchasing Power Index',
  }

  return (
    <div className="space-y-6">
      <Link to="/explorer" className="no-print inline-flex items-center gap-1 text-sm muted hover:text-accent-strong">
        <ArrowLeft size={14} /> Back to City Explorer
      </Link>

      <header className="panel panel-pad flex flex-wrap items-center gap-4">
        <Flag code={city.countryCode} size="text-4xl" />
        <div className="flex-1">
          <h1 className="heading-h1">{city.name}</h1>
          <p className="text-sm muted">
            {city.country} · {city.continent} · {city.currency} · population{' '}
            {city.population ? formatNumber(city.population) : 'n/a'} · {city.lat.toFixed(3)}, {city.lon.toFixed(3)}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button
            onClick={() => store.toggleFavourite(city.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
              fav ? 'border-negative/40 bg-negative-soft text-negative' : 'border-slate-300 dark:border-ink-600'
            }`}
          >
            <Heart size={13} fill={fav ? 'currentColor' : 'none'} />
            {fav ? 'Saved to favourites' : 'Add to favourites'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-ink-600"
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </header>

      {estimate && (
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Your monthly basket"
            value={fmt(estimate.total)}
            sub={`${profile.label} profile`}
            tone="accent"
          />
          {city.averageNetSalary && (
            <StatCard
              label="Illustrative avg net salary"
              value={fmt(city.averageNetSalary.value)}
              sub={`${fmtLocal(city.averageNetSalary.value)} local`}
            />
          )}
          <StatCard
            label="Rent, 1-bed centre"
            value={fmt(city.housing.centre1bed.value)}
            sub={`${fmtLocal(city.housing.centre1bed.value)} local`}
          />
          <StatCard
            label="Purchasing power"
            value={city.indices.localPurchasingPower != null ? city.indices.localPurchasingPower.toFixed(0) : '—'}
            sub="local index level"
            tone={city.indices.localPurchasingPower != null && city.indices.localPurchasingPower >= 100 ? 'positive' : 'warning'}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Economic indicators" subtitle="Numbeo-style indices, New York ≈ 100">
          <ul className="divide-y divide-slate-100 text-sm dark:divide-ink-800">
            {indices.map(([key, value]) => (
              <li key={key} className="flex items-center justify-between py-2">
                <span>{indexLabels[key] ?? key}</span>
                <span className="font-bold tabular-nums">{value.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <SourceNote source={city.source} link={city.verifyUrl} />
        </Card>

        <Card title="Monthly living costs" subtitle={`Your ${profile.label} profile, ${store.displayCurrency}`}>
          {estimate ? (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-ink-800">
              {CATEGORY_ORDER.map((cat) => {
                const val = estimate.breakdown[cat]
                const share = estimate.total > 0 ? (val / estimate.total) * 100 : 0
                return (
                  <li key={cat} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {CATEGORY_LABELS[cat]}
                      {estimate.overridden.includes(cat) && (
                        <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-bold text-accent-strong">custom</span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="hidden h-1.5 w-24 overflow-hidden rounded bg-slate-100 dark:bg-ink-800 sm:block">
                        <span className="block h-full rounded bg-accent-strong" style={{ width: `${Math.min(100, share)}%` }} />
                      </span>
                      <span className="w-24 text-right font-semibold tabular-nums">{fmt(val)}</span>
                    </span>
                  </li>
                )
              })}
              <li className="flex items-center justify-between py-2 text-base font-extrabold">
                <span>Total</span>
                <span className="tabular-nums text-accent-strong">{fmt(estimate.total)}</span>
              </li>
            </ul>
          ) : null}
        </Card>

        <Card title="Housing" subtitle="Monthly rent, local prices and converted">
          <ul className="divide-y divide-slate-100 text-sm dark:divide-ink-800">
            {(Object.keys(city.housing) as HousingKey[]).map((k) => (
              <li key={k} className="flex items-center justify-between py-2">
                <span>{HOUSING_LABELS[k]}</span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{fmt(city.housing[k].value)}</span>
                  <span className="block text-[11px] muted">{fmtLocal(city.housing[k].value)}</span>
                </span>
              </li>
            ))}
          </ul>
          <SourceNote source={city.housing.centre1bed.source} link={city.verifyUrl} />
        </Card>

        <Card title="Lifestyle prices" subtitle="Typical single-purchase prices">
          <ul className="divide-y divide-slate-100 text-sm dark:divide-ink-800">
            <li className="flex justify-between py-2"><span>Inexpensive meal</span><span className="font-semibold">{fmtLocal(city.lifestyle.mealInexpensive.value)}</span></li>
            <li className="flex justify-between py-2"><span>Mid-range dinner for two</span><span className="font-semibold">{fmtLocal(city.lifestyle.mealMidRange.value)}</span></li>
            <li className="flex justify-between py-2"><span>Cappuccino</span><span className="font-semibold">{fmtLocal(city.lifestyle.coffee.value)}</span></li>
            <li className="flex justify-between py-2"><span>Single transit ticket</span><span className="font-semibold">{fmtLocal(city.lifestyle.transitSingle.value)}</span></li>
            <li className="flex justify-between py-2"><span>Monthly transit pass</span><span className="font-semibold">{fmtLocal(city.lifestyle.transitPass.value)}</span></li>
            <li className="flex justify-between py-2"><span>Gym membership (monthly)</span><span className="font-semibold">{fmtLocal(city.lifestyle.gymMonthly.value)}</span></li>
            <li className="flex justify-between py-2"><span>Cinema ticket</span><span className="font-semibold">{fmtLocal(city.lifestyle.cinema.value)}</span></li>
            <li className="flex justify-between py-2"><span>Basic grocery staples (monthly)</span><span className="font-semibold">{fmtLocal(city.lifestyle.staplesMonthly.value)}</span></li>
          </ul>
          <SourceNote source={city.lifestyle.coffee.source} link={city.verifyUrl} />
        </Card>
      </div>

      <Card title="Data quality" subtitle="Read this before using these figures in a decision">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            <ConfidenceBadge confidence={city.source.confidence} /> — values marked{' '}
            <b>{city.source.kind}</b> are rounded, illustrative estimates structured after the Numbeo taxonomy.
            They are not live data and must not be treated as such.
          </p>
          <p className="muted">
            Source: {city.source.name}. Reference date: {city.source.referenceDate}. To verify the real figures, open the{' '}
            <a href={city.verifyUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-accent-strong hover:underline">
              verification page for {city.name} ↗
            </a>{' '}
            and compare, then override every category in the Salary Simulator to model your actual basket.
          </p>
          {city.source.notes && <p className="muted">Note: {city.source.notes}</p>}
        </div>
      </Card>
    </div>
  )
}
