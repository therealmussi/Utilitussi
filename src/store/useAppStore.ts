import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConvertedRates,
  CurrencyCode,
  LifestyleId,
  SavedBudget,
  SavedComparison,
  SavedRelocation,
  SavedSimulation,
} from '../types'
import { FALLBACK_RATES } from '../data/currencies'
import { currentUid } from '../lib/export'

export type Theme = 'dark' | 'light'

interface AppState {
  theme: Theme
  displayCurrency: CurrencyCode
  lifestyleId: LifestyleId
  homeCityId: string
  favourites: string[]
  recentSimulations: SavedSimulation[]
  savedComparisons: SavedComparison[]
  savedBudgets: SavedBudget[]
  savedRelocations: SavedRelocation[]
  rates: ConvertedRates

  setTheme: (t: Theme) => void
  setDisplayCurrency: (c: CurrencyCode) => void
  setLifestyleId: (l: LifestyleId) => void
  setHomeCityId: (id: string) => void
  toggleFavourite: (cityId: string) => void
  setRates: (r: ConvertedRates) => void

  addSimulation: (s: Omit<SavedSimulation, 'id' | 'createdAt'>) => void
  addComparison: (s: Omit<SavedComparison, 'id' | 'createdAt'>) => void
  saveBudget: (b: Omit<SavedBudget, 'id' | 'createdAt'>) => void
  deleteBudget: (id: string) => void
  addRelocation: (s: Omit<SavedRelocation, 'id' | 'createdAt'>) => void
  clearAllData: () => void
}

const KEEP = 20

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      displayCurrency: 'EUR',
      lifestyleId: 'standard',
      homeCityId: 'turin',
      favourites: [],
      recentSimulations: [],
      savedComparisons: [],
      savedBudgets: [],
      savedRelocations: [],
      rates: FALLBACK_RATES,

      setTheme: (theme) => set({ theme }),
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      setLifestyleId: (lifestyleId) => set({ lifestyleId }),
      setHomeCityId: (homeCityId) => set({ homeCityId }),
      setRates: (rates) => set({ rates }),
      toggleFavourite: (cityId) =>
        set((s) => ({
          favourites: s.favourites.includes(cityId)
            ? s.favourites.filter((f) => f !== cityId)
            : [...s.favourites, cityId],
        })),

      addSimulation: (sim) =>
        set((s) => ({
          recentSimulations: [
            { ...sim, id: currentUid(), createdAt: new Date().toISOString() },
            ...s.recentSimulations,
          ].slice(0, KEEP),
        })),
      addComparison: (cmp) =>
        set((s) => ({
          savedComparisons: [
            { ...cmp, id: currentUid(), createdAt: new Date().toISOString() },
            ...s.savedComparisons,
          ].slice(0, KEEP),
        })),
      saveBudget: (b) =>
        set((s) => ({
          savedBudgets: [
            ...s.savedBudgets.filter((x) => x.name !== b.name),
            { ...b, id: currentUid(), createdAt: new Date().toISOString() },
          ].slice(0, KEEP),
        })),
      deleteBudget: (id) =>
        set((s) => ({ savedBudgets: s.savedBudgets.filter((b) => b.id !== id) })),
      addRelocation: (rel) =>
        set((s) => ({
          savedRelocations: [
            { ...rel, id: currentUid(), createdAt: new Date().toISOString() },
            ...s.savedRelocations,
          ].slice(0, KEEP),
        })),
      clearAllData: () =>
        set({
          favourites: [],
          recentSimulations: [],
          savedComparisons: [],
          savedBudgets: [],
          savedRelocations: [],
        }),
    }),
    { name: 'life-cost-simulator' },
  ),
)
