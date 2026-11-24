import type { ExpenseCategory, LifestyleProfile, LifestyleId } from '../types'

type Multipliers = Record<Exclude<ExpenseCategory, 'accommodation'>, number>

const ALL_CATEGORIES: Exclude<ExpenseCategory, 'accommodation'>[] = [
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

function mult(map: Partial<Multipliers>, fallback: number): Multipliers {
  const out = {} as Multipliers
  for (const c of ALL_CATEGORIES) out[c] = map[c] ?? fallback
  return out
}

export const LIFESTYLE_PROFILES: Record<LifestyleId, LifestyleProfile> = {
  student: {
    id: 'student',
    label: 'Student',
    description:
      'Shared accommodation, low food expenses, public transport, limited entertainment budget.',
    housing: { base: 'outside1bed', multiplier: 0.45 },
    multipliers: mult(
      {
        groceries: 0.7,
        restaurants: 0.4,
        transport: 0.8,
        utilities: 0.7,
        internetMobile: 0.7,
        healthcare: 0.7,
        leisure: 0.5,
        sports: 0.5,
        clothing: 0.5,
        personal: 0.6,
        other: 0.5,
      },
      0.6,
    ),
  },
  budget: {
    id: 'budget',
    label: 'Budget',
    description:
      'Affordable accommodation, cooking at home, limited leisure expenses.',
    housing: { base: 'outside1bed', multiplier: 0.7 },
    multipliers: mult(
      {
        groceries: 0.85,
        restaurants: 0.5,
        transport: 0.9,
        utilities: 0.85,
        internetMobile: 0.85,
        healthcare: 0.85,
        leisure: 0.6,
        sports: 0.6,
        clothing: 0.7,
        personal: 0.75,
        other: 0.7,
      },
      0.75,
    ),
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description:
      'Private accommodation, regular restaurants, normal leisure activities, moderate savings.',
    housing: { base: 'outside1bed', multiplier: 1 },
    multipliers: mult({}, 1),
  },
  comfortable: {
    id: 'comfortable',
    label: 'Comfortable',
    description:
      'Better accommodation, frequent restaurants, sports and entertainment, more disposable income.',
    housing: { base: 'centre1bed', multiplier: 1 },
    multipliers: mult(
      {
        groceries: 1.15,
        restaurants: 1.5,
        transport: 1.1,
        utilities: 1.1,
        internetMobile: 1.1,
        leisure: 1.5,
        sports: 1.4,
        clothing: 1.4,
        personal: 1.25,
        other: 1.2,
      },
      1.25,
    ),
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    description:
      'High-quality accommodation, frequent leisure activities, higher shopping and travel budgets.',
    housing: { base: 'centre1bed', multiplier: 1.5 },
    multipliers: mult(
      {
        groceries: 1.35,
        restaurants: 2,
        transport: 1.3,
        utilities: 1.2,
        internetMobile: 1.2,
        healthcare: 1.3,
        leisure: 2,
        sports: 1.8,
        clothing: 1.9,
        personal: 1.6,
        other: 1.5,
      },
      1.6,
    ),
  },
}

export const LIFESTYLE_LIST = Object.values(LIFESTYLE_PROFILES)
