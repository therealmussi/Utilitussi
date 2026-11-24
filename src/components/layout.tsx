import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe2,
  Scale,
  Calculator,
  Wallet,
  Plane,
  Trophy,
  Settings as SettingsIcon,
  Heart,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'

import { useAppStore } from '../store/useAppStore'
import { SUPPORTED_CURRENCIES } from '../data/currencies'
import { fetchLiveRates } from '../lib/currency'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/explorer', label: 'City Explorer', icon: Globe2, end: false },
  { to: '/compare', label: 'Compare Cities', icon: Scale, end: false },
  { to: '/salary', label: 'Salary Simulator', icon: Calculator, end: false },
  { to: '/budget', label: 'Monthly Budget', icon: Wallet, end: false },
  { to: '/relocation', label: 'Relocation Planner', icon: Plane, end: false },
  { to: '/rankings', label: 'Global Rankings', icon: Trophy, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
]

export function ThemeEffect() {
  const theme = useAppStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return null
}

function RatesStatus() {
  const rates = useAppStore((s) => s.rates)
  const setRates = useAppStore((s) => s.setRates)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  const refresh = async () => {
    setState('loading')
    try {
      const live = await fetchLiveRates()
      setRates(live)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (rates.live) {
    return (
      <span className="hidden items-center gap-1.5 text-xs muted lg:inline-flex" title={`Live exchange rates · ${rates.provider} · ${rates.referenceDate}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-positive" />
        FX {rates.referenceDate}
      </span>
    )
  }
  return (
    <button
      onClick={refresh}
      className="inline-flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2 py-1 text-xs text-slate-700 hover:bg-warning/20 dark:text-slate-200"
      title="Bundled FX snapshot in use. Click to retry the live exchange-rate fetch (free public endpoint, no key)."
    >
      <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : ''} />
      FX static {rates.referenceDate}
    </button>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const displayCurrency = useAppStore((s) => s.displayCurrency)
  const setDisplayCurrency = useAppStore((s) => s.setDisplayCurrency)
  const favourites = useAppStore((s) => s.favourites)

  const nav = (
    <>
      <Link to="/" className="mb-6 flex items-center gap-3 px-2" onClick={() => setOpen(false)}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-strong font-black text-ink-950">LC</div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">LIFE COST</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-strong">Simulator</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-soft font-bold text-accent-strong'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200'
              }`
            }
          >
            <Icon size={17} />
            {label}
            {to === '/explorer' && favourites.length > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-ink-800 dark:text-slate-400">
                <Heart size={9} />
                {favourites.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-ink-800">
        <label className="field-label">Display currency</label>
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-ink-600 dark:bg-ink-850 dark:text-slate-100"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[10px] leading-relaxed muted">
          Comparisons use one FX reference. Conversion is not purchasing-power parity.
        </p>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-ink-800 dark:bg-ink-900 md:flex">
        {nav}
      </aside>

      {/* Mobile top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95 md:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent-strong text-xs font-black text-ink-950">LC</div>
          <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">LIFE COST</span>
        </Link>
        <div className="flex items-center gap-2">
          <RatesStatus />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            className="rounded-lg border border-slate-300 p-1.5 dark:border-ink-600"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="no-print fixed inset-0 top-[53px] z-30 overflow-y-auto bg-white px-4 py-4 dark:bg-ink-900 md:hidden">{nav}</div>
      )}
    </>
  )
}

export function DesktopFooter() {
  const rates = useAppStore((s) => s.rates)
  return (
    <footer className="no-print mt-10 border-t border-slate-200 pt-4 pb-8 text-[11px] leading-relaxed muted dark:border-ink-800">
      <p className="flex flex-wrap items-center gap-x-2">
        <RatesStatus />
        <span>
          {rates.live ? 'Live' : 'Static'} FX rates base EUR, reference {rates.referenceDate} · {rates.provider}.
        </span>
      </p>
      <p className="mt-1">
        Seed city statistics are illustrative and carry explicit confidence labels. Verify figures against Numbeo,
        Eurostat, OECD and national statistical institutes before financial decisions. Conversion ≠ purchasing-power parity.
      </p>
    </footer>
  )
}

