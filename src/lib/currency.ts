import type { CurrencyCode, ConvertedRates } from '../types'
import { FALLBACK_RATES } from '../data/currencies'

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ConvertedRates,
): number {
  if (from === to) return amount
  const rateFrom = rates.rates[from]
  const rateTo = rates.rates[to]
  if (!rateFrom || !rateTo) return amount
  return (amount / rateFrom) * rateTo
}

/**
 * Runtime fetch of live rates from the free, keyless ExchangeRate-API open
 * endpoint (or a configurable mirror; see .env.example). Falls back to the
 * bundled static snapshot on any failure. An API key must never be embedded
 * here; if a paid provider is required, proxy it server-side.
 */
export async function fetchLiveRates(): Promise<ConvertedRates> {
  const url =
    import.meta.env.VITE_EXCHANGE_RATE_API_URL ?? 'https://open.er-api.com/v6/latest/EUR'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Exchange-rate API returned ${res.status}`)
  const data = await res.json()
  if (!data?.rates || !data.time_last_update_utc) throw new Error('Malformed exchange-rate payload')
  const refDate = new Date(data.time_last_update_utc).toISOString().slice(0, 10)
  const wanted = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN']
  const rates: Record<string, number> = { ...FALLBACK_RATES.rates }
  for (const code of wanted) {
    if (typeof data.rates[code] === 'number') rates[code] = data.rates[code]
  }
  return {
    base: 'EUR',
    rates,
    referenceDate: refDate,
    provider: typeof data.provider === 'string' ? data.provider : 'ExchangeRate-API',
    live: true,
  }
}

export function formatMoney(
  amount: number,
  code: CurrencyCode,
  options: { compact?: boolean; signed?: boolean } = {},
): string {
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  const intl = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    notation: options.compact && abs >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: abs < 10 && !Number.isInteger(amount) ? 2 : 0,
  })
  const formatted = intl.format(abs)
  if (options.signed) return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatted}`
  return amount < 0 ? `−${formatted}` : formatted
}

export function formatPct(value: number, options: { signed?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '—'
  const sign = options.signed && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}
