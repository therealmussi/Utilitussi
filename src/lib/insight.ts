import type { City, CurrencyCode, ConvertedRates, ExpenseCategory, LifestyleId } from '../types'
import { CITIES, CATEGORY_LABELS, CATEGORY_ORDER } from '../data/cities'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import { applyLifestyle, pctDifference, type CostEstimate } from './finance'
import { convert, formatMoney, formatPct } from './currency'

/**
 * Insights are generated exclusively from values present in the application
 * data. When a datum is missing the corresponding sentence is skipped, never
 * invented.
 */

export function financialInsight(
  home: City,
  display: CurrencyCode,
  rates: ConvertedRates,
  lifestyleId: LifestyleId,
): string[] {
  const profile = LIFESTYLE_PROFILES[lifestyleId]
  const homeEst = applyLifestyle(home, profile)
  const sentences: string[] = []

  const others = CITIES.filter((c) => c.id !== home.id)
  const othersTotals = others
    .map((c) => ({ city: c, total: convert(applyLifestyle(c, profile).total, c.currency, display, rates) }))
    .sort((a, b) => a.total - b.total)
  const homeTotal = convert(homeEst.total, home.currency, display, rates)

  if (othersTotals.length > 0) {
    const cheapest = othersTotals[0]
    const priciest = othersTotals[othersTotals.length - 1]
    const vsCheapest = pctDifference(cheapest.total, homeTotal)
    const vsPriciest = pctDifference(priciest.total, homeTotal)
    const name = `${home.name}`
    if (vsPriciest < -5) {
      sentences.push(
        `Living in ${name} is estimated at ${formatMoney(homeTotal, display)} per month with your ${profile.label.toLowerCase()} profile — ${formatPct(vsPriciest, { signed: true })} versus the most expensive city in the dataset, ${priciest.city.name} (${formatMoney(priciest.total, display)}).`,
      )
    } else if (vsPriciest > 5) {
      sentences.push(
        `${name} is the most expensive market in the current dataset for your ${profile.label.toLowerCase()} profile: ${formatMoney(homeTotal, display)} per month, ${formatPct(vsPriciest, { signed: true })} versus the runner-up.`,
      )
    }
    if (vsCheapest > 5) {
      sentences.push(
        `The most affordable alternative in the dataset is ${cheapest.city.name} at ${formatMoney(cheapest.total, display)} per month — moving there would save roughly ${formatMoney(homeTotal - cheapest.total, display)} per month with the same profile.`,
      )
    }
  }

  if (home.averageNetSalary) {
    const salary = convert(home.averageNetSalary.value, home.currency, display, rates)
    const coverage = salary > 0 ? (salary / convert(homeEst.total, home.currency, display, rates)) * 100 : 0
    const verdict = coverage >= 120 ? 'comfortably covers' : coverage >= 100 ? 'roughly covers' : 'does not fully cover'
    sentences.push(
      `The illustrative average net salary in ${home.name} (${formatMoney(salary, display)}) ${verdict} this basket, with about ${formatPct(coverage - 100, { signed: true })} of headroom — an rough indicator of local purchasing power, not a substitute for your own budget.`,
    )
  }

  const rentShare = homeEst.breakdown.accommodation / homeEst.total
  if (rentShare > 0.25) {
    sentences.push(
      `Accommodation absorbs ${(rentShare * 100).toFixed(0)}% of the estimated budget in ${home.name}; housing terms deserve particular attention in any relocation decision.`,
    )
  }

  return sentences
}

export function comparisonVerdict(
  estimates: { city: City; est: CostEstimate }[],
  display: CurrencyCode,
  rates: ConvertedRates,
): string[] {
  if (estimates.length < 2) return []
  const totals = estimates.map((e) => ({
    city: e.city,
    total: convert(e.est.total, e.city.currency, display, rates),
  }))
  const sorted = [...totals].sort((a, b) => a.total - b.total)
  const cheapest = sorted[0]
  const priciest = sorted[sorted.length - 1]
  const out: string[] = []

  const gap = pctDifference(cheapest.total, priciest.total)
  out.push(
    `${cheapest.city.name} is the most affordable of the selected cities at ${formatMoney(cheapest.total, display)} per month, while ${priciest.city.name} is the most expensive at ${formatMoney(priciest.total, display)} — a ${formatPct(gap, { signed: true })} gap between extremes.`,
  )

  // Largest single-category driver of the gap between cheapest and priciest,
  // measured in the reference display currency.
  const cheapestEst = estimates.find((e) => e.city.id === cheapest.city.id)!
  const priciestEst = estimates.find((e) => e.city.id === priciest.city.id)!
  const diffs = CATEGORY_ORDER.map((cat) => ({
    cat,
    diff:
      convert(priciestEst.est.breakdown[cat], priciestEst.city.currency, display, rates) -
      convert(cheapestEst.est.breakdown[cat], cheapestEst.city.currency, display, rates),
  }))
  const top = [...diffs].sort((x, y) => y.diff - x.diff)[0]
  if (top && top.diff > 0) {
    out.push(
      `The gap is driven primarily by ${CATEGORY_LABELS[top.cat as ExpenseCategory].toLowerCase()}, which accounts for about ${formatMoney(top.diff, display)} of the monthly difference.`,
    )
  }

  if (estimates.length === 2) {
    const [first, last] = estimates
    const pppA = first.city.indices.localPurchasingPower
    const pppB = last.city.indices.localPurchasingPower
    if (pppA != null && pppB != null && Math.abs(pppB - pppA) > 10) {
      const hi = pppA >= pppB ? first.city : last.city
      const lo = hi.id === first.city.id ? last.city : first.city
      out.push(
        `Purchasing power does not follow prices: ${hi.name} scores noticeably higher on the local purchasing-power index than ${lo.name}, which can partly offset its higher costs.`,
      )
    }
  }

  return out
}
