import { describe, expect, it } from 'vitest'
import {
  applyLifestyle,
  breakEvenMonths,
  compareOutcome,
  disposableIncome,
  emergencyFundTarget,
  pctDifference,
  relocationInitialBudget,
  requiredSalary,
  roundToCents,
  savingsRate,
  DEFAULT_RELOCATION_ITEMS,
} from '../lib/finance'
import { convert } from '../lib/currency'
import { FALLBACK_RATES } from '../data/currencies'
import { CITIES, cityById } from '../data/cities'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'

describe('roundToCents', () => {
  it('eliminates floating-point drift', () => {
    expect(roundToCents(0.1 + 0.2)).toBeCloseTo(0.3, 10)
  })
  it('handles invalid input', () => {
    expect(roundToCents(NaN)).toBe(0)
    expect(roundToCents(Infinity)).toBe(0)
  })
})

describe('requiredSalary', () => {
  it('scales the salary by the destination/current cost ratio', () => {
    expect(requiredSalary(2500, 1500, 3000)).toBe(5000)
  })
  it('is exact when costs are equal', () => {
    expect(requiredSalary(2500, 1500, 1500)).toBe(2500)
  })
  it('returns 0 for invalid inputs', () => {
    expect(requiredSalary(0, 100, 100)).toBe(0)
    expect(requiredSalary(100, 0, 100)).toBe(0)
  })
})

describe('disposableIncome and compareOutcome', () => {
  it('marks a clearly better destination', () => {
    const r = compareOutcome(2500, 1500, 2500, 1200)
    expect(r.outcome).toBe('better')
    expect(r.pct).toBeGreaterThan(0)
  })
  it('marks a clearly worse destination', () => {
    const r = compareOutcome(2500, 1500, 2500, 2100)
    expect(r.outcome).toBe('worse')
  })
  it('treats small differences as equivalent', () => {
    const r = compareOutcome(2500, 1500, 2500, 1505)
    expect(r.outcome).toBe('equivalent')
  })
  it('computes disposable income', () => {
    expect(disposableIncome(3000, 2100)).toBe(900)
  })
})

describe('pctDifference', () => {
  it('computes signed percentage change', () => {
    expect(pctDifference(100, 150)).toBe(50)
    expect(pctDifference(150, 100)).toBeCloseTo(-33.33, 1)
  })
  it('avoids division by zero', () => {
    expect(pctDifference(0, 0)).toBe(0)
    expect(pctDifference(0, 50)).toBe(100)
  })
})

describe('savingsRate', () => {
  it('computes the savings rate', () => {
    expect(savingsRate(3000, 2000)).toBeCloseTo(33.33, 1)
    expect(savingsRate(3000, 4000)).toBeCloseTo(-33.33, 1)
    expect(savingsRate(0, 100)).toBe(0)
  })
})

describe('relocation', () => {
  it('scales only variable items across scenarios', () => {
    const items = structuredClone(DEFAULT_RELOCATION_ITEMS).map((i) => ({
      ...i,
      variable: true,
      amount: 1000,
      status: 'estimated' as const,
    }))
    const avg = relocationInitialBudget(items, 'average')
    const best = relocationInitialBudget(items, 'best')
    const worst = relocationInitialBudget(items, 'worst')
    expect(avg).toBe(items.filter((i) => i.amount > 0).length * 1000)
    expect(best).toBeLessThan(avg)
    expect(worst).toBeGreaterThan(avg)
  })
  it('computes break-even months conservatively', () => {
    expect(breakEvenMonths(1200, 100)).toBe(12)
    expect(breakEvenMonths(1000, 0)).toBeNull()
    expect(breakEvenMonths(0, 100)).toBe(0)
  })
  it('targets a 3-month emergency fund', () => {
    expect(emergencyFundTarget(1200)).toBe(3600)
  })
})

describe('currency conversion', () => {
  it('is identity for the same currency', () => {
    expect(convert(100, 'EUR', 'EUR', FALLBACK_RATES)).toBe(100)
  })
  it('converts EUR to CHF and back consistently', () => {
    const there = convert(1000, 'EUR', 'CHF', FALLBACK_RATES)
    const back = convert(there, 'CHF', 'EUR', FALLBACK_RATES)
    expect(back).toBeCloseTo(1000, 6)
  })
  it('falls back to the input when a rate is missing', () => {
    expect(convert(100, 'GBP', 'XYZ' as never, FALLBACK_RATES)).toBe(100)
  })
})

describe('dataset integrity', () => {
  it('every city produces a positive basket for every lifestyle profile', () => {
    for (const city of CITIES) {
      for (const profile of Object.values(LIFESTYLE_PROFILES)) {
        const est = applyLifestyle(city, profile)
        expect(est.total).toBeGreaterThan(0)
      }
    }
  })
  it('every city declares a source with a reference date', () => {
    for (const city of CITIES) {
      expect(city.source.name.length).toBeGreaterThan(0)
      expect(city.source.referenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(city.source.kind).toBe('illustrative')
      expect(city.verifyUrl).toMatch(/^https:\/\//)
    }
  })
  it('all city currencies are covered by the bundled FX snapshot', () => {
    for (const city of CITIES) {
      expect(FALLBACK_RATES.rates[city.currency]).toBeDefined()
    }
  })
  it('Turin → Geneva example behaves as documented', () => {
    const turin = cityById('turin')!
    const geneva = cityById('geneva')!
    const cur = applyLifestyle(turin, LIFESTYLE_PROFILES.standard)
    const dest = applyLifestyle(geneva, LIFESTYLE_PROFILES.standard)
    expect(dest.total).toBeGreaterThan(cur.total)
    const rates = FALLBACK_RATES
    const req = requiredSalary(2500, cur.total, convert(dest.total, geneva.currency, turin.currency, rates))
    expect(req).toBeGreaterThan(2500)
  })
})
