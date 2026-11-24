import type { City, CurrencyCode, ConvertedRates } from '../types'
import { CATEGORY_ORDER } from '../data/cities'
import type { CostEstimate, CategoryBreakdown } from './finance'
import { applyLifestyle } from './finance'
import { convert } from './currency'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import type { LifestyleProfile } from '../types'

export function convertEstimate(
  estimate: CostEstimate,
  display: CurrencyCode,
  rates: ConvertedRates,
): { breakdown: CategoryBreakdown; total: number } {
  const breakdown = { ...estimate.breakdown }
  for (const cat of CATEGORY_ORDER) {
    breakdown[cat] = convert(breakdown[cat], estimate.currency, display, rates)
  }
  return { breakdown, total: convert(estimate.total, estimate.currency, display, rates) }
}

export interface CitySnapshot {
  city: City
  estimate: CostEstimate
  totalDisplay: number
}

export function snapshotFor(
  city: City,
  profile: LifestyleProfile,
  display: CurrencyCode,
  rates: ConvertedRates,
): CitySnapshot {
  const estimate = applyLifestyle(city, profile)
  return { city, estimate, totalDisplay: convert(estimate.total, city.currency, display, rates) }
}

export interface RankingMetric {
  id: string
  label: string
  description: string
  /** Higher is better. */
  higherIsBetter: boolean
  requiresSalary?: boolean
  value: (city: City, display: CurrencyCode, rates: ConvertedRates) => number | null
  format: (value: number, display: CurrencyCode) => string
}

function monthlyTotal(city: City, display: CurrencyCode, rates: ConvertedRates): number {
  const est = applyLifestyle(city, LIFESTYLE_REF)
  return convert(est.total, city.currency, display, rates)
}

// The reference profile for rankings is "standard" — the neutral baseline.
const LIFESTYLE_REF = LIFESTYLE_PROFILES.standard

export const RANKING_METRICS: RankingMetric[] = [
  {
    id: 'cheapest',
    label: 'Cheapest cities',
    description: 'Total estimated monthly cost of the Standard lifestyle basket, converted to your display currency.',
    higherIsBetter: false,
    value: (c, d, r) => monthlyTotal(c, d, r),
    format: (v, d) => `${Math.round(v).toLocaleString('en-US')} ${d} / mo`,
  },
  {
    id: 'most-expensive',
    label: 'Most expensive cities',
    description: 'Total estimated monthly cost of the Standard lifestyle basket, converted to your display currency.',
    higherIsBetter: true,
    value: (c, d, r) => monthlyTotal(c, d, r),
    format: (v, d) => `${Math.round(v).toLocaleString('en-US')} ${d} / mo`,
  },
  {
    id: 'rent-low',
    label: 'Lowest accommodation costs',
    description: 'Outside-centre 1-bedroom apartment rent, converted to your display currency.',
    higherIsBetter: false,
    value: (c, d, r) => convert(c.housing.outside1bed.value, c.currency, d, r),
    format: (v, d) => `${Math.round(v).toLocaleString('en-US')} ${d} / mo`,
  },
  {
    id: 'rent-high',
    label: 'Highest accommodation costs',
    description: 'Outside-centre 1-bedroom apartment rent, converted to your display currency.',
    higherIsBetter: true,
    value: (c, d, r) => convert(c.housing.outside1bed.value, c.currency, d, r),
    format: (v, d) => `${Math.round(v).toLocaleString('en-US')} ${d} / mo`,
  },
  {
    id: 'ppp',
    label: 'Best purchasing power',
    description: 'Local purchasing-power index (Numbeo-style scale). Higher means local wages buy more locally.',
    higherIsBetter: true,
    value: (c) => c.indices.localPurchasingPower ?? null,
    format: (v) => v.toFixed(1) + ' pts',
  },
  {
    id: 'salary-to-cost',
    label: 'Best salary-to-cost relationship',
    description: 'Average net salary divided by the estimated Standard-lifestyle monthly cost (both converted to your display currency).',
    higherIsBetter: true,
    requiresSalary: true,
    value: (c, d, r) => {
      const salary = c.averageNetSalary?.value
      if (!salary) return null
      const convertedSalary = convert(salary, c.currency, d, r)
      const cost = monthlyTotal(c, d, r)
      return cost > 0 ? convertedSalary / cost : null
    },
    format: (v) => `${v.toFixed(2)}×`,
  },
]
