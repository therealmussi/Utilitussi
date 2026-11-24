import type {
  City,
  ExpenseCategory,
  LifestyleProfile,
  SimOutcome,
} from '../types'
import { CATEGORY_ORDER } from '../data/cities'

/**
 * All monetary calculations round to cents at every step to avoid
 * floating-point drift. Rich financial logic must live here, never in UI
 * components.
 */

export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

export function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b
}

export type CategoryBreakdown = Record<ExpenseCategory, number>

export interface CategoryOverride {
  category: ExpenseCategory
  value: number
}

export interface CostEstimate {
  cityId: string
  currency: City['currency']
  breakdown: CategoryBreakdown
  total: number
  housingLabel: string
  housingBaseValue: number
  overridden: ExpenseCategory[]
}

export const EMPTY_BREAKDOWN: CategoryBreakdown = Object.fromEntries(
  CATEGORY_ORDER.map((c) => [c, 0]),
) as CategoryBreakdown

export function applyLifestyle(
  city: City,
  profile: LifestyleProfile,
  overrides: CategoryOverride[] = [],
): CostEstimate {
  const breakdown: CategoryBreakdown = { ...EMPTY_BREAKDOWN }
  for (const cat of CATEGORY_ORDER) {
    const base = city.monthlyCategories[cat]?.value ?? 0
    if (cat === 'accommodation') {
      const housingValue = city.housing[profile.housing.base]?.value ?? base
      breakdown[cat] = roundToCents(housingValue * profile.housing.multiplier)
    } else {
      breakdown[cat] = roundToCents(base * profile.multipliers[cat])
    }
  }
  const overridden: ExpenseCategory[] = []
  for (const o of overrides) {
    if (!CATEGORY_ORDER.includes(o.category)) continue
    if (!Number.isFinite(o.value)) continue
    breakdown[o.category] = roundToCents(o.value)
    overridden.push(o.category)
  }
  const total = roundToCents(
    CATEGORY_ORDER.reduce((sum, c) => sum + breakdown[c], 0),
  )
  return {
    cityId: city.id,
    currency: city.currency,
    breakdown,
    total,
    housingLabel: profile.housing.base,
    housingBaseValue: city.housing[profile.housing.base]?.value ?? 0,
    overridden,
  }
}

/**
 * Salary equivalence: the destination net salary that preserves the ratio
 * between income and the selected lifestyle basket in the origin city.
 *  required = currentNet * (destCost / currentCost)
 * This is a NET-to-NET cost-of-living comparison, not a gross-to-net tax
 * calculation.
 */
export function requiredSalary(
  currentNet: number,
  currentCost: number,
  destCost: number,
): number {
  if (currentNet <= 0 || currentCost <= 0 || destCost < 0) return 0
  return roundToCents(currentNet * (destCost / currentCost))
}

export function disposableIncome(net: number, cost: number): number {
  return roundToCents(net - cost)
}

export function compareOutcome(
  currentNet: number,
  currentCost: number,
  destNet: number,
  destCost: number,
): { outcome: SimOutcome; pct: number; surplus: number } {
  const surplus = roundToCents(
    disposableIncome(destNet, destCost) - disposableIncome(currentNet, currentCost),
  )
  const pct = pctDifference(
    disposableIncome(currentNet, currentCost),
    disposableIncome(destNet, destCost),
  )
  const outcome: SimOutcome = pct > 2 ? 'better' : pct < -2 ? 'worse' : 'equivalent'
  return { outcome, pct, surplus }
}

export function pctDifference(before: number, after: number): number {
  if (before === 0) return after === 0 ? 0 : after > 0 ? 100 : -100
  return roundToCents(((after - before) / Math.abs(before)) * 100)
}

export function savingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0
  return roundToCents(((income - expenses) / income) * 100)
}

export function annualise(monthly: number): number {
  return roundToCents(monthly * 12)
}

export interface RelocationItemInput {
  key: string
  label: string
  amount: number
  status: 'estimated' | 'confirmed'
  variable: boolean
}

export const DEFAULT_RELOCATION_ITEMS: RelocationItemInput[] = [
  { key: 'travel', label: 'Travel expenses', amount: 350, status: 'estimated', variable: false },
  { key: 'tempStay', label: 'Temporary accommodation', amount: 1200, status: 'estimated', variable: true },
  { key: 'deposit', label: 'Security deposit', amount: 0, status: 'estimated', variable: false },
  { key: 'firstRent', label: "First month's rent", amount: 0, status: 'confirmed', variable: false },
  { key: 'moving', label: 'Moving costs', amount: 900, status: 'estimated', variable: true },
  { key: 'admin', label: 'Administrative expenses (visas, permits, registrations)', amount: 250, status: 'estimated', variable: false },
  { key: 'furniture', label: 'Furniture and household setup', amount: 800, status: 'estimated', variable: true },
  { key: 'emergency', label: 'Emergency fund', amount: 2000, status: 'estimated', variable: false },
]

export interface ScenarioKey {
  label: string
  multiplier: number
}

export const SCENARIOS: Record<'best' | 'average' | 'worst', ScenarioKey> = {
  best: { label: 'Best case', multiplier: 0.75 },
  average: { label: 'Expected', multiplier: 1 },
  worst: { label: 'Worst case', multiplier: 1.4 },
}

export function relocationInitialBudget(
  items: RelocationItemInput[],
  scenario: keyof typeof SCENARIOS = 'average',
): number {
  const mult = SCENARIOS[scenario].multiplier
  const total = items.reduce((sum, item) => {
    if (item.amount <= 0) return sum
    return sum + (item.variable ? item.amount * mult : item.amount)
  }, 0)
  return roundToCents(total)
}

export function emergencyFundTarget(destMonthlyCost: number): number {
  return roundToCents(destMonthlyCost * 3)
}

/**
 * Financial break-even: months needed for the extra disposable income gained
 * by the move to repay the initial relocation budget.
 */
export function breakEvenMonths(
  initialBudget: number,
  monthlyGainAfterMove: number,
): number | null {
  if (!Number.isFinite(initialBudget) || !Number.isFinite(monthlyGainAfterMove)) return null
  if (initialBudget <= 0) return 0
  if (monthlyGainAfterMove <= 0) return null
  return Math.ceil(initialBudget / monthlyGainAfterMove)
}
