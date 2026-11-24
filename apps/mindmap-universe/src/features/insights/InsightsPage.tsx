import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { Network, Trash2, Sparkles, AlertCircle, TrendingUp, TrendingDown, Merge } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { KIND_COLORS } from '@/services/factory'
import { degree, adjacency } from '@/knowledge/similarity'
import { suggestConnections, findDuplicates, findIsolatedNodes } from '@/knowledge/discovery'
import { Badge, Button, ConfidenceBar, SectionTitle } from '@/components/ui'
import { truncate } from '@/utils/text'

const TYPE_COLORS = ['#4f8cff', '#3ecfa0', '#e5b567', '#e98cb0', '#a78bfa', '#f07f6a', '#7cc7a8', '#ffd166', '#63b3ed', '#c3a6ff']

export function InsightsPage() {
  const { nodes, connections, collections, sources } = useUniverseData()
  const addConnection = useAppStore((s) => s.addConnection)
  const mergeDuplicate = useAppStore((s) => s.mergeDuplicate)
  const learningPaths = useAppStore(useShallow((s) => s.learningPaths.filter((p) => p.universeId === s.activeUniverseId)))

  const [includeSuggestions, setIncludeSuggestions] = useState(true)

  const kindData = useMemo(() => {
    const count = new Map<string, number>()
    for (const n of nodes) count.set(n.kind, (count.get(n.kind) ?? 0) + 1)
    return [...count.entries()].map(([kind, v]) => ({ kind, count: v })).sort((a, b) => b.count - a.count)
  }, [nodes])

  const relationData = useMemo(() => {
    const count = new Map<string, number>()
    for (const c of connections) count.set(c.type, (count.get(c.type) ?? 0) + 1)
    return [...count.entries()].map(([type, value]) => ({ type: type.replace(/-/g, ' '), value })).sort((a, b) => b.value - a.value)
  }, [connections])

  const deg = useMemo(() => degree(nodes, connections), [nodes, connections])
  const topConcepts = useMemo(
    () => [...deg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, d]) => ({ node: nodes.find((n) => n.id === id), d })).filter((x) => x.node && x.d > 0),
    [deg, nodes],
  )

  const isolated = useMemo(() => findIsolatedNodes(nodes, connections), [nodes, connections])
  const duplicates = useMemo(() => findDuplicates(nodes), [nodes])
  const suggestions = useMemo(() => (includeSuggestions ? suggestConnections(nodes, connections, 8) : []), [nodes, connections, includeSuggestions])

  const learningProgress = useMemo(() => {
    const totals = { 'not-started': 0, 'in-progress': 0, understood: 0, 'needs-revision': 0 }
    for (const p of learningPaths) {
      for (const id of p.itemIds) {
        const st = p.items[id]?.status ?? 'not-started'
        totals[st] = (totals[st] ?? 0) + 1
      }
    }
    return Object.entries(totals).map(([status, value]) => ({ status, value })).filter((x) => x.value > 0)
  }, [learningPaths])

  const mostDeveloped = useMemo(() => {
    const map = new Map<string, number>()
    const adj = adjacency(nodes, connections)
    for (const n of nodes) {
      for (const t of n.tags) map.set(t, (map.get(t) ?? 0) + 1 + (adj.get(n.id)?.size ?? 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [nodes, connections])

  const underdeveloped = useMemo(() => isolated.filter((n) => (deg.get(n.id) ?? 0) === 0).slice(0, 8), [isolated, deg])

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-ink-2">
          <Network size={40} className="mx-auto mb-3 text-ink-3" />
          No data in this universe yet. Add nodes and connections — the analytics are computed only from your real data.
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-lg font-semibold">Insights</h1>
      <p className="mb-5 text-xs text-ink-2">Every number on this page is derived from your actual saved data.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Nodes" value={nodes.length} />
        <Stat label="Connections" value={connections.length} />
        <Stat label="Collections" value={collections.length} />
        <Stat label="Sources" value={sources.length} />
        <Stat label="Isolated" value={isolated.length} warn={isolated.length > nodes.length / 2} />
        <Stat label="Duplicates" value={duplicates.length} warn={duplicates.length > 0} />
        <Stat label="Suggestions" value={suggestions.length} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle>Knowledge distribution by type</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kindData}>
              <CartesianGrid stroke="var(--color-hair)" vertical={false} />
              <XAxis dataKey="kind" tick={{ fill: 'var(--color-ink-3)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--color-ink-3)', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-hair)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {kindData.map((d) => (
                  <Cell key={d.kind} fill={KIND_COLORS[d.kind as keyof typeof KIND_COLORS]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle>Relationship types</SectionTitle>
          {relationData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-xs text-ink-3">No connections yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={relationData} dataKey="value" nameKey="type" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {relationData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-hair)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<TrendingUp size={14} className="text-good" />}>Most connected concepts</SectionTitle>
          {topConcepts.length === 0 && <div className="text-xs text-ink-3">Connect some nodes first.</div>}
          {topConcepts.map(({ node, d }) => (
            <div key={node!.id} className="flex items-center justify-between py-1 text-sm">
              <span className="max-w-[70%] truncate">{node!.title}</span>
              <span className="text-[11px] text-ink-3">{d} links</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<TrendingDown size={14} className="text-bad" />}>Isolated entries</SectionTitle>
          {isolated.length === 0 ? (
            <div className="text-xs text-good">Every entry is connected. Excellent.</div>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {isolated.slice(0, 12).map((n) => (
                <div key={n.id} className="flex items-center justify-between py-0.5 text-xs">
                  <span className="max-w-[80%] truncate text-ink-2">{n.title}</span>
                  <Badge color={KIND_COLORS[n.kind]}>{n.kind}</Badge>
                </div>
              ))}
            </div>
          )}
          {underdeveloped.length >= 5 && (
            <div className="mt-2 flex items-start gap-1.5 rounded bg-panel-2 p-2 text-[11px] text-ink-2">
              <AlertCircle size={12} className="mt-0.5 text-warn" />
              Many isolated entries: this suggests collecting more and connecting more. Try the AI Assistant suggestions.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle>Most developed topics</SectionTitle>
          {mostDeveloped.length === 0 && <div className="text-xs text-ink-3">Add tags to see topic density.</div>}
          {mostDeveloped.map(([tag, score]) => (
            <div key={tag} className="mb-1.5">
              <div className="mb-0.5 flex justify-between text-xs">
                <span>#{tag}</span>
                <span className="text-[10px] text-ink-3">score {score}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (score / Math.max(mostDeveloped[0][1], 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<Sparkles size={14} className="text-accent" />}>Suggested connections to explore</SectionTitle>
          {suggestions.length === 0 && <div className="text-xs text-ink-3">Nothing suggested right now — add more overlapping entries, tags and descriptions.</div>}
          {suggestions.slice(0, 6).map((s) => {
            const a = nodes.find((n) => n.id === s.sourceId)
            const b = nodes.find((n) => n.id === s.targetId)
            if (!a || !b) return null
            return (
              <div key={`${s.sourceId}-${s.targetId}`} className="mb-2 rounded-md border border-hair bg-panel-2 p-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="max-w-[65%] truncate font-medium">{truncate(a.title, 26)} ↔ {truncate(b.title, 26)}</span>
                  <ConfidenceBar value={s.confidence} />
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] text-ink-2">{s.explanation}</div>
                <Button variant="outline" className="mt-1.5 text-xs" onClick={() => void addConnection(s.sourceId, s.targetId, s.type, s.explanation)}>
                  Accept connection
                </Button>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<Merge size={14} className="text-warn" />}>Potential duplicates</SectionTitle>
          {duplicates.length === 0 ? (
            <div className="text-xs text-good">No overlapping concepts detected.</div>
          ) : (
            duplicates.slice(0, 6).map((d) => {
              const keep = nodes.find((n) => n.id === d.keepId)
              const absorb = nodes.find((n) => n.id === d.absorbId)
              if (!keep || !absorb) return null
              return (
                <div key={`${d.keepId}-${d.absorbId}`} className="mb-2 flex items-center justify-between rounded-md border border-hair bg-panel-2 p-2.5 text-xs">
                  <span className="max-w-[60%] truncate">{keep.title} ≈ {absorb.title}</span>
                  <div className="flex items-center gap-2">
                    <ConfidenceBar value={d.score} />
                    <Button variant="outline" className="text-xs" onClick={() => void mergeDuplicate(d.keepId, d.absorbId)}>Merge</Button>
                  </div>
                </div>
              )
            })
          )}
          <div className="mt-3 text-[10px] text-ink-3">
            <Trash2 size={10} className="mr-1 inline" /> Merging keeps all connections of both nodes. Nothing is merged automatically.
          </div>
        </div>
      </div>

      <div className="my-4 flex items-center justify-center">
        <label className="flex items-center gap-2 text-[11px] text-ink-2">
          <input type="checkbox" checked={includeSuggestions} onChange={(e) => setIncludeSuggestions(e.target.checked)} />
          include live connection suggestions in the stats
        </label>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? 'border-warn/60 bg-warn/5' : 'border-hair bg-panel'}`}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[10px] tracking-wide text-ink-3 uppercase">{label}</div>
    </div>
  )
}
