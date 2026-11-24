export type CurrencyCode =
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CHF'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'

export type Continent =
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Asia'
  | 'Africa'
  | 'Oceania'

export type ExpenseCategory =
  | 'accommodation'
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'utilities'
  | 'internetMobile'
  | 'healthcare'
  | 'leisure'
  | 'sports'
  | 'clothing'
  | 'personal'
  | 'other'

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'

export type DataKind = 'official' | 'aggregated' | 'estimate' | 'illustrative'

export interface SourceInfo {
  name: string
  referenceDate: string
  retrievedAt?: string
  confidence: Confidence
  kind: DataKind
  notes?: string
}

export interface PricePoint {
  /** Value expressed in the city's local currency. */
  value: number
  source: SourceInfo
}

export interface CityIndices {
  costOfLiving?: number
  rent?: number
  groceries?: number
  restaurants?: number
  localPurchasingPower?: number
}

export type HousingKey =
  | 'centre1bed'
  | 'outside1bed'
  | 'centre3bed'
  | 'outside3bed'

export interface HousingCosts {
  centre1bed: PricePoint
  outside1bed: PricePoint
  centre3bed: PricePoint
  outside3bed: PricePoint
}

export interface LifestylePrices {
  mealInexpensive: PricePoint
  mealMidRange: PricePoint
  coffee: PricePoint
  transitSingle: PricePoint
  transitPass: PricePoint
  gymMonthly: PricePoint
  cinema: PricePoint
  staplesMonthly: PricePoint
}

export interface City {
  id: string
  name: string
  country: string
  countryCode: string
  continent: Continent
  currency: CurrencyCode
  lat: number
  lon: number
  population?: number
  indices: CityIndices
  averageNetSalary?: PricePoint
  /** Estimated monthly cost per person, single person, in local currency. */
  monthlyCategories: Record<ExpenseCategory, PricePoint>
  housing: HousingCosts
  lifestyle: LifestylePrices
  source: SourceInfo
  verifyUrl: string
}

export type LifestyleId = 'student' | 'budget' | 'standard' | 'comfortable' | 'premium'

export interface LifestyleProfile {
  id: LifestyleId
  label: string
  description: string
  housing: { base: HousingKey; multiplier: number }
  multipliers: Record<
    Exclude<ExpenseCategory, 'accommodation'>,
    number
  >
}

export interface ConvertedRates {
  base: 'EUR'
  rates: Record<string, number>
  referenceDate: string
  provider: string
  live: boolean
}

export type SimOutcome = 'better' | 'equivalent' | 'worse'

export interface SavedSimulation {
  id: string
  createdAt: string
  fromCityId: string
  toCityId: string
  netSalary: number
  lifestyleId: LifestyleId
  requiredSalary: number
  outcome: SimOutcome
  displayCurrency: CurrencyCode
}

export interface SavedComparison {
  id: string
  createdAt: string
  cityIds: string[]
  displayCurrency: CurrencyCode
}

export interface BudgetLine {
  label: string
  amount: number
}

export interface BudgetGroup {
  id: string
  label: string
  income: boolean
  lines: BudgetLine[]
}

export interface SavedBudget {
  id: string
  name: string
  createdAt: string
  groups: BudgetGroup[]
}

export interface RelocationCostItem {
  key: string
  label: string
  amount: number
  status: 'estimated' | 'confirmed'
  variable: boolean
}

export interface SavedRelocation {
  id: string
  createdAt: string
  fromCityId: string
  toCityId: string
  lifestyleId: LifestyleId
  displayCurrency: CurrencyCode
  initialBudget: number
  destMonthlyCost: number
  breakEvenMonths: number | null
}

export interface BudgetInput {
  income: Record<string, number>
  expenses: Record<string, number>
}
