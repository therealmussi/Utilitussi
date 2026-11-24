import type {
  City,
  Confidence,
  CurrencyCode,
  Continent,
  ExpenseCategory,
  HousingKey,
  PricePoint,
  SourceInfo,
} from '../types'

/**
 * SEED DATASET — ILLUSTRATIVE VALUES
 *
 * The values below are rounded, hand-curated estimates structured to mirror
 * the Numbeo cost-of-living taxonomy (monthly, single-person, local currency)
 * so they can be replaced 1:1 by a licensed feed (Numbeo API, Eurostat, OECD,
 * national statistical institutes) without changing any application code.
 *
 * They are NOT live or officially sourced figures. Every value carries an
 * explicit source describing it as `illustrative` with confidence `LOW` (or
 * `MEDIUM` where a public reference value exists). Users can override every
 * value in the app, and each city profile links to Numbeo for verification.
 *
 * Swap this file for a provider module implementing the same `City` type to
 * plug in real data — see docs/data-sources.md.
 */

const REF_DATE = '2026-11-24'
const DATASET_NAME = 'LCS illustrative seed dataset'

function seedSource(confidence: Confidence, notes?: string): SourceInfo {
  return {
    name: DATASET_NAME,
    referenceDate: REF_DATE,
    retrievedAt: REF_DATE,
    confidence,
    kind: 'illustrative',
    notes:
      notes ??
      'Rounded, hand-curated estimate structured after the Numbeo taxonomy. Replace with a licensed live feed before relying on these numbers.',
  }
}

// Category order: accommodation, groceries, restaurants, transport, utilities,
// internetMobile, healthcare, leisure, sports, clothing, personal, other
const CAT_KEYS: ExpenseCategory[] = [
  'accommodation',
  'groceries',
  'restaurants',
  'transport',
  'utilities',
  'internetMobile',
  'healthcare',
  'leisure',
  'sports',
  'clothing',
  'personal',
  'other',
]

// Lifestyle order: mealInexpensive, mealMidRange, coffee, transitSingle,
// transitPass, gymMonthly, cinema, staplesMonthly (grocery staples for one person)

interface Spec {
  id: string
  name: string
  country: string
  cc: string
  continent: Continent
  currency: CurrencyCode
  lat: number
  lon: number
  population?: number
  salary?: number
  indices: [number, number, number, number, number] // COL, rent, groceries, restaurants, PPP
  cats: number[]
  housing: Record<HousingKey, number>
  life: number[]
  verifySlug: string
  confidence?: Confidence
  note?: string
}

const SPECS: Spec[] = [
  {
    id: 'turin', name: 'Turin', country: 'Italy', cc: 'IT', continent: 'Europe',
    currency: 'EUR', lat: 45.07, lon: 7.69, population: 848000, salary: 1550,
    indices: [55, 30, 45, 55, 85],
    cats: [800, 300, 180, 40, 130, 40, 30, 120, 45, 50, 60, 60],
    housing: { centre1bed: 780, outside1bed: 560, centre3bed: 1400, outside3bed: 950 },
    life: [16, 45, 1.5, 1.9, 40, 45, 10, 280],
    verifySlug: 'in/Turin',
  },
  {
    id: 'milan', name: 'Milan', country: 'Italy', cc: 'IT', continent: 'Europe',
    currency: 'EUR', lat: 45.46, lon: 9.19, population: 1372000, salary: 1800,
    indices: [65, 55, 48, 58, 95],
    cats: [1200, 350, 220, 39, 150, 45, 35, 150, 55, 70, 70, 70],
    housing: { centre1bed: 1300, outside1bed: 950, centre3bed: 2300, outside3bed: 1650 },
    life: [18, 55, 1.6, 2.2, 39, 50, 11, 310],
    verifySlug: 'in/Milan',
  },
  {
    id: 'paris', name: 'Paris', country: 'France', cc: 'FR', continent: 'Europe',
    currency: 'EUR', lat: 48.86, lon: 2.35, population: 2100000, salary: 2600,
    indices: [74, 66, 60, 78, 105],
    cats: [1350, 380, 260, 87, 160, 50, 50, 180, 65, 80, 80, 80],
    housing: { centre1bed: 1450, outside1bed: 1050, centre3bed: 2700, outside3bed: 1900 },
    life: [20, 60, 2.1, 2.5, 87, 60, 13, 340],
    verifySlug: 'in/Paris',
  },
  {
    id: 'lyon', name: 'Lyon', country: 'France', cc: 'FR', continent: 'Europe',
    currency: 'EUR', lat: 45.76, lon: 4.84, population: 520000, salary: 2200,
    indices: [66, 46, 55, 71, 100],
    cats: [950, 340, 210, 65, 150, 45, 45, 150, 55, 70, 75, 70],
    housing: { centre1bed: 980, outside1bed: 720, centre3bed: 1800, outside3bed: 1300 },
    life: [18, 50, 2, 2, 65, 50, 11, 320],
    verifySlug: 'in/Lyon',
  },
  {
    id: 'luxembourg', name: 'Luxembourg', country: 'Luxembourg', cc: 'LU', continent: 'Europe',
    currency: 'EUR', lat: 49.61, lon: 6.13, population: 132000, salary: 3650,
    indices: [82, 74, 65, 85, 120],
    cats: [1800, 400, 280, 0, 190, 55, 80, 200, 70, 90, 90, 90],
    housing: { centre1bed: 1900, outside1bed: 1500, centre3bed: 3300, outside3bed: 2600 },
    life: [25, 75, 2.4, 0, 0, 70, 14, 380],
    note: 'Public transport nationwide has been free since 2020; the transport category reflects that policy.',
    verifySlug: 'in/Luxembourg',
  },
  {
    id: 'geneva', name: 'Geneva', country: 'Switzerland', cc: 'CH', continent: 'Europe',
    currency: 'CHF', lat: 46.2, lon: 6.14, population: 201000, salary: 6500,
    indices: [117, 84, 118, 145, 130],
    cats: [2300, 550, 400, 70, 150, 60, 350, 220, 90, 120, 110, 100],
    housing: { centre1bed: 2350, outside1bed: 1900, centre3bed: 4200, outside3bed: 3300 },
    life: [32, 90, 4.2, 3.5, 70, 90, 22, 520],
    verifySlug: 'in/Geneva',
  },
  {
    id: 'zurich', name: 'Zurich', country: 'Switzerland', cc: 'CH', continent: 'Europe',
    currency: 'CHF', lat: 47.37, lon: 8.54, population: 430000, salary: 6800,
    indices: [122, 78, 115, 150, 135],
    cats: [2500, 500, 420, 88, 160, 60, 350, 230, 95, 120, 110, 100],
    housing: { centre1bed: 2550, outside1bed: 2050, centre3bed: 4600, outside3bed: 3600 },
    life: [33, 95, 4.5, 2.9, 88, 95, 23, 500],
    verifySlug: 'in/Zurich',
  },
  {
    id: 'london', name: 'London', country: 'United Kingdom', cc: 'GB', continent: 'Europe',
    currency: 'GBP', lat: 51.51, lon: -0.13, population: 8800000, salary: 2900,
    indices: [83, 72, 65, 85, 110],
    cats: [2100, 320, 240, 160, 200, 45, 60, 200, 60, 90, 90, 90],
    housing: { centre1bed: 2200, outside1bed: 1650, centre3bed: 3900, outside3bed: 2800 },
    life: [18, 45, 3.4, 3.5, 160, 50, 15, 300],
    verifySlug: 'in/London',
  },
  {
    id: 'berlin', name: 'Berlin', country: 'Germany', cc: 'DE', continent: 'Europe',
    currency: 'EUR', lat: 52.52, lon: 13.4, population: 3800000, salary: 2500,
    indices: [65, 40, 48, 55, 105],
    cats: [1200, 300, 180, 49, 160, 45, 180, 150, 45, 70, 70, 70],
    housing: { centre1bed: 1300, outside1bed: 900, centre3bed: 2200, outside3bed: 1600 },
    life: [14, 45, 2.5, 3.5, 49, 35, 13, 280],
    note: 'The Deutschlandticket (€49/month) covers regional public transport across Germany.',
    verifySlug: 'in/Berlin',
  },
  {
    id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', cc: 'NL', continent: 'Europe',
    currency: 'EUR', lat: 52.37, lon: 4.9, population: 920000, salary: 3000,
    indices: [75, 65, 55, 71, 115],
    cats: [1800, 350, 240, 100, 200, 55, 140, 180, 55, 80, 80, 80],
    housing: { centre1bed: 1900, outside1bed: 1500, centre3bed: 3200, outside3bed: 2500 },
    life: [20, 55, 3, 2.4, 100, 50, 14, 320],
    note: 'The healthcare category includes the statutory basic health insurance premium (zorgverzekering).',
    verifySlug: 'in/Amsterdam',
  },
  {
    id: 'barcelona', name: 'Barcelona', country: 'Spain', cc: 'ES', continent: 'Europe',
    currency: 'EUR', lat: 41.39, lon: 2.17, population: 1660000, salary: 1650,
    indices: [56, 39, 45, 52, 90],
    cats: [1050, 300, 190, 54, 130, 40, 60, 140, 45, 65, 65, 60],
    housing: { centre1bed: 1100, outside1bed: 830, centre3bed: 1900, outside3bed: 1400 },
    life: [14, 40, 1.8, 2.55, 54, 40, 10, 270],
    verifySlug: 'in/Barcelona',
  },
  {
    id: 'montreal', name: 'Montréal', country: 'Canada', cc: 'CA', continent: 'North America',
    currency: 'CAD', lat: 45.5, lon: -73.57, population: 1762000, salary: 2900,
    indices: [68, 40, 58, 62, 105],
    cats: [1400, 400, 220, 100, 110, 65, 60, 180, 60, 90, 80, 70],
    housing: { centre1bed: 1500, outside1bed: 1100, centre3bed: 2400, outside3bed: 1800 },
    life: [20, 55, 3.8, 3.75, 100, 55, 15, 420],
    note: 'Quebec residents are covered by the public RAMQ health plan; the healthcare line covers extras such as dental and drugs.',
    verifySlug: 'in/Montreal',
  },
  {
    id: 'new-york', name: 'New York', country: 'United States', cc: 'US', continent: 'North America',
    currency: 'USD', lat: 40.71, lon: -74.01, population: 8260000, salary: 5600,
    indices: [100, 100, 78, 100, 130],
    cats: [3500, 550, 400, 132, 180, 70, 350, 280, 100, 130, 130, 120],
    housing: { centre1bed: 3600, outside1bed: 2600, centre3bed: 6800, outside3bed: 4600 },
    life: [30, 80, 5, 2.9, 132, 90, 18, 550],
    verifySlug: 'in/New-York',
  },
  {
    id: 'tokyo', name: 'Tokyo', country: 'Japan', cc: 'JP', continent: 'Asia',
    currency: 'JPY', lat: 35.68, lon: 139.69, population: 13960000, salary: 350000,
    indices: [62, 42, 55, 55, 100],
    cats: [110000, 42000, 30000, 10000, 15000, 8000, 20000, 30000, 9000, 12000, 12000, 10000],
    housing: { centre1bed: 115000, outside1bed: 83000, centre3bed: 210000, outside3bed: 150000 },
    life: [1000, 3000, 480, 220, 10000, 9000, 2000, 40000],
    verifySlug: 'in/Tokyo',
  },
  {
    id: 'sydney', name: 'Sydney', country: 'Australia', cc: 'AUD', continent: 'Oceania',
    currency: 'AUD', lat: -33.87, lon: 151.21, population: 5310000, salary: 4900,
    indices: [82, 68, 70, 75, 120],
    cats: [2400, 500, 300, 190, 190, 70, 130, 220, 70, 100, 90, 90],
    housing: { centre1bed: 2650, outside1bed: 1950, centre3bed: 4200, outside3bed: 3000 },
    life: [24, 60, 4, 3.2, 190, 60, 21, 430],
    verifySlug: 'in/Sydney',
  },
  {
    id: 'copenhagen', name: 'Copenhagen', country: 'Denmark', cc: 'DKK', continent: 'Europe',
    currency: 'DKK', lat: 55.68, lon: 12.57, population: 660000, salary: 4100,
    indices: [83, 62, 60, 90, 125],
    cats: [1050, 380, 300, 550, 180, 40, 0, 200, 60, 100, 80, 80],
    housing: { centre1bed: 1150, outside1bed: 880, centre3bed: 1900, outside3bed: 1400 },
    life: [120, 300, 4, 30, 550, 250, 110, 1300],
    note: 'Danish public healthcare is tax-funded; the healthcare line is 0 because no insurance premium applies. The transport pass figure reflects the Copenhagen commuter-zone monthly pass.',
    verifySlug: 'in/Copenhagen',
  },
]

function buildCity(spec: Spec): City {
  const [col, rentIdx, groc, rest, ppp] = spec.indices
  const src: SourceInfo = seedSource(spec.confidence ?? 'LOW', spec.note)
  const p = (value: number, confidence: Confidence = 'LOW', notes?: string) => ({ value, source: seedSource(confidence, notes) })
  return {
    id: spec.id,
    name: spec.name,
    country: spec.country,
    countryCode: spec.cc,
    continent: spec.continent,
    currency: spec.currency,
    lat: spec.lat,
    lon: spec.lon,
    population: spec.population,
    indices: {
      costOfLiving: col,
      rent: rentIdx,
      groceries: groc,
      restaurants: rest,
      localPurchasingPower: ppp,
    },
    averageNetSalary: spec.salary != null
      ? p(spec.salary, 'LOW', 'Illustrative median net monthly salary for a typical professional. Verify against national statistics before use.')
      : undefined,
    monthlyCategories: Object.fromEntries(
      CAT_KEYS.map((k, i) => [k, p(spec.cats[i])]),
    ) as Record<ExpenseCategory, PricePoint>,
    housing: {
      centre1bed: p(spec.housing.centre1bed),
      outside1bed: p(spec.housing.outside1bed),
      centre3bed: p(spec.housing.centre3bed),
      outside3bed: p(spec.housing.outside3bed),
    },
    lifestyle: {
      mealInexpensive: p(spec.life[0]),
      mealMidRange: p(spec.life[1]),
      coffee: p(spec.life[2]),
      transitSingle: p(spec.life[3]),
      transitPass: p(spec.life[4]),
      gymMonthly: p(spec.life[5]),
      cinema: p(spec.life[6]),
      staplesMonthly: p(spec.life[7]),
    },
    source: src,
    verifyUrl: `https://www.numbeo.com/cost-of-living/${spec.verifySlug}`,
  } as City
}

export const CITIES: City[] = SPECS.map(buildCity)

export const CITY_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c]),
)

export const CONTINENTS: Continent[] = [
  'Europe',
  'North America',
  'South America',
  'Asia',
  'Africa',
  'Oceania',
]

export const COUNTRIES: string[] = [...new Set(CITIES.map((c) => c.country))].sort()

export function cityById(id: string): City | undefined {
  return CITY_MAP[id]
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: 'Accommodation',
  groceries: 'Groceries',
  restaurants: 'Restaurants',
  transport: 'Public transport',
  utilities: 'Utilities',
  internetMobile: 'Internet & mobile',
  healthcare: 'Healthcare',
  leisure: 'Leisure',
  sports: 'Sports',
  clothing: 'Clothing',
  personal: 'Personal expenses',
  other: 'Other expenses',
}

export const CATEGORY_ORDER: ExpenseCategory[] = CAT_KEYS

export const HOUSING_LABELS: Record<HousingKey, string> = {
  centre1bed: '1-bedroom, city centre',
  outside1bed: '1-bedroom, outside centre',
  centre3bed: '3-bedroom, city centre',
  outside3bed: '3-bedroom, outside centre',
}
