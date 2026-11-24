import type { CurrencyCode, ConvertedRates } from '../types'

export interface CurrencyMeta {
  code: CurrencyCode
  label: string
  symbol: string
  locale: string
  decimals: number
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'de-DE', decimals: 0 },
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 0 },
  { code: 'GBP', label: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 0 },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', decimals: 0 },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', decimals: 0 },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 0 },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE', decimals: 0 },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO', decimals: 0 },
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr', locale: 'da-DK', decimals: 0 },
  { code: 'PLN', label: 'Polish Złoty', symbol: 'zł', locale: 'pl-PL', decimals: 0 },
]

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  if (!meta) throw new Error(`Unsupported currency: ${code}`)
  return meta
}

/**
 * Fallback exchange rates, base EUR, retrieved from the public
 * ExchangeRate-API open endpoint (https://open.er-api.com) on
 * 2026-11-24 (time_last_update_utc of the API response).
 *
 * The application attempts a live refresh at runtime; these static rates are
 * only used when no network is available, so the tool never fabricates rates.
 */
export const FALLBACK_RATES: ConvertedRates = {
  base: 'EUR',
  referenceDate: '2026-11-24',
  provider: 'exchangerate-api.com (open endpoint, static fallback)',
  live: false,
  rates: {
    EUR: 1,
    USD: 1.092139,
    GBP: 0.837008,
    CHF: 0.918726,
    CAD: 1.567622,
    AUD: 1.648682,
    JPY: 173.68323,
    SEK: 11.211093,
    NOK: 10.731434,
    DKK: 7.474858,
    PLN: 4.45031,
    SGD: 1.409174,
    ZAR: 19.016413,
    BRL: 6.531558,
    KRW: 1470.056377,
    INR: 101.47522,
    AED: 4.010786,
    MXN: 20.93401,
    NZD: 2.00264,
  },
}
