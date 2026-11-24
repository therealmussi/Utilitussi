import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafTooltip } from 'react-leaflet'
import { Search, Heart } from 'lucide-react'
import { CITIES, CONTINENTS, COUNTRIES, cityById } from '../data/cities'
import { useAppStore } from '../store/useAppStore'
import { LIFESTYLE_PROFILES } from '../data/lifestyle'
import { applyLifestyle } from '../lib/finance'
import { convert, formatMoney, formatNumber } from '../lib/currency'
import { Card, Select, Flag, SourceNote } from '../components/ui'
import type { City, Continent } from '../types'

interface Row {
  city: City
  total: number
}

function CityMap({ rows, onSelect, display }: { rows: Row[]; onSelect: (id: string) => void; display: string }) {
  const totals = rows.map((r) => r.total)
  const min = totals.length ? Math.min(...totals) : 0
  const max = totals.length ? Math.max(...totals) : 1

  return (
    <MapContainer center={[46, 8]} zoom={3} scrollWheelZoom className="h-[420px] w-full rounded-xl" worldCopyJump>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rows.map(({ city, total }) => {
        const rel = max > min ? (total - min) / (max - min) : 0.5
        return (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lon]}
            radius={8 + rel * 12}
            pathOptions={{
              color: '#2dd4bf',
              weight: 2,
              fillColor: '#14b8a6',
              fillOpacity: 0.45 + rel * 0.4,
            }}
            eventHandlers={{ click: () => onSelect(city.id) }}
          >
            <LeafTooltip direction="top" opacity={1}>
              {city.name} — {Math.round(total).toLocaleString('en-US')} {display}/mo
            </LeafTooltip>
            <Popup>
              <div className="min-w-[190px]">
                <p className="mb-1 text-sm font-bold">
                  {city.name}, {city.country}
                </p>
                <p className="text-xs">
                  Est. monthly cost:{' '}
                  <b>
                    {Math.round(total).toLocaleString('en-US')} {display}
                  </b>
                </p>
                <button
                  className="mt-2 rounded bg-accent-strong px-2 py-1 text-xs font-bold text-ink-950"
                  onClick={() => onSelect(city.id)}
                >
                  Open city profile
                </button>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

export default function CityExplorer() {
  const navigate = useNavigate()
  const store = useAppStore()
  const [query, setQuery] = useState('')
  const [continent, setContinent] = useState<Continent | ''>('')
  const [country, setCountry] = useState('')
  const [selected, setSelected] = useState<City | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CITIES.filter((c) => {
      if (continent && c.continent !== continent) return false
      if (country && c.country !== country) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.continent.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
      )
    })
  }, [query, continent, country])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return CITIES.filter(
      (c) => c.name.toLowerCase().startsWith(q) || c.country.toLowerCase().startsWith(q),
    ).slice(0, 6)
  }, [query])

  const rates = store.rates
  const profile = LIFESTYLE_PROFILES[store.lifestyleId]
  const rows = useMemo(
    () =>
      filtered.map((city) => ({
        city,
        total: convert(applyLifestyle(city, profile).total, city.currency, store.displayCurrency, rates),
      })),
    [filtered, profile, store.displayCurrency, rates],
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-h1">🌍 City Explorer</h1>
        <p className="mt-1 text-sm muted">
          Zoom the map, search by city, country, region, continent or currency, and open a full city profile.
        </p>
      </header>

      <Card className="relative overflow-visible">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, country or region…"
            aria-label="Search cities"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-ink-600 dark:bg-ink-850 dark:text-slate-100"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card dark:border-ink-600 dark:bg-ink-850">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent-soft"
                    onClick={() => navigate(`/explorer/${c.id}`)}
                  >
                    <Flag code={c.countryCode} size="text-base" />
                    <span className="font-semibold">{c.name}</span>
                    <span className="muted">{c.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select
            value={continent}
            onChange={(e) => setContinent(e.target.value as Continent | '')}
            aria-label="Filter by continent"
          >
            <option value="">All continents</option>
            {CONTINENTS.filter((k) => CITIES.some((c) => c.continent === k)).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Filter by country">
            <option value="">All countries</option>
            {COUNTRIES.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {selected && (
        <Card
          title={`${selected.name}, ${selected.country}`}
          subtitle="City selected from the map"
          right={
            <button className="no-print" onClick={() => setSelected(null)} aria-label="Clear selection">
              ✕
            </button>
          }
        >
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <li>
              <span className="block text-xs muted">Currency</span>
              {selected.currency}
            </li>
            <li>
              <span className="block text-xs muted">Population</span>
              {selected.population ? formatNumber(selected.population) : '—'}
            </li>
            <li>
              <span className="block text-xs muted">COL index</span>
              {selected.indices.costOfLiving ?? '—'}
            </li>
            <li>
              <span className="block text-xs muted">Coordinates</span>
              {selected.lat.toFixed(2)}, {selected.lon.toFixed(2)}
            </li>
          </ul>
          <SourceNote source={selected.source} link={selected.verifyUrl} />
        </Card>
      )}

      <Card
        title="World map"
        subtitle={`Bubble size = estimated monthly cost in ${store.displayCurrency} · map data © OpenStreetMap contributors`}
      >
        <CityMap
          rows={rows}
          onSelect={(id) => setSelected(cityById(id) ?? null)}
          display={store.displayCurrency}
        />
        {selected && (
          <div className="mt-3">
            <Link
              to={`/explorer/${selected.id}`}
              className="inline-flex items-center rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-accent"
            >
              Open full city profile →
            </Link>
          </div>
        )}
      </Card>

      <Card title={`${rows.length} cities`} subtitle={`Standard-lifestyle totals in ${store.displayCurrency}`}>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm muted">No city matches the current filters.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {rows
              .slice()
              .sort((a, b) => a.total - b.total)
              .map(({ city, total }) => {
                const fav = store.favourites.includes(city.id)
                return (
                  <li key={city.id} className="flex items-center gap-3 py-2.5">
                    <button
                      aria-label={fav ? `Remove ${city.name} from favourites` : `Add ${city.name} to favourites`}
                      onClick={() => store.toggleFavourite(city.id)}
                      className={fav ? 'text-negative' : 'text-slate-300 hover:text-negative'}
                    >
                      <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
                    </button>
                    <Link to={`/explorer/${city.id}`} className="flex flex-1 items-center gap-3 hover:text-accent-strong">
                      <Flag code={city.countryCode} size="text-xl" />
                      <span>
                        <span className="block text-sm font-semibold">{city.name}</span>
                        <span className="block text-xs muted">
                          {city.country} · {city.continent}
                        </span>
                      </span>
                    </Link>
                    {city.indices.localPurchasingPower != null && (
                      <span className="hidden text-xs muted sm:block">PPP {city.indices.localPurchasingPower}</span>
                    )}
                    <span className="text-sm font-bold tabular-nums">{formatMoney(total, store.displayCurrency)}</span>
                  </li>
                )
              })}
          </ul>
        )}
      </Card>
    </div>
  )
}
