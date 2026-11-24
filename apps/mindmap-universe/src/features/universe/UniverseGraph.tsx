import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ZoomIn, ZoomOut, Maximize, Crosshair, Link2, Filter, X, Rocket,
} from 'lucide-react'
import type { GraphLayoutKind, KnowledgeNode } from '@/types'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { KIND_COLORS, NODE_KINDS } from '@/services/factory'
import { computeLayout } from '@/graph/layouts'
import { searchNodes, adjacency } from '@/knowledge/similarity'
import { Button, Select } from '@/components/ui'
import { NodePanel } from './NodePanel'

const CANVAS_W = 1600
const CANVAS_H = 1100

export function UniverseGraph() {
  const { nodes, connections } = useUniverseData()
  const addNode = useAppStore((s) => s.addNode)
  const addConnection = useAppStore((s) => s.addConnection)

  const [layout, setLayout] = useState<GraphLayoutKind>(() => {
    return (localStorage.getItem('mmu.layout') as GraphLayoutKind) ?? useAppStore.getState().preferences.defaultLayout
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => localStorage.setItem('mmu.layout', layout), [layout])

  const allTags = useMemo(() => [...new Set(nodes.flatMap((n) => n.tags))].sort(), [nodes])

  const visible: KnowledgeNode[] = useMemo(() => {
    let list = searchNodes(nodes, { kinds: kindFilter as KnowledgeNode['kind'][], tags: tagFilter, query: filterQuery })
    if (focusMode && selected) {
      const adj = adjacency(nodes, connections)
      const keep = new Set<string>([selected, ...(adj.get(selected) ?? [])])
      list = list.filter((n) => keep.has(n.id))
    }
    return list
  }, [nodes, connections, kindFilter, tagFilter, filterQuery, focusMode, selected])

  const positions = useMemo(() => {
    const full = computeLayout(layout, visible, connections.filter((c) => {
      const included = new Set(visible.map((n) => n.id))
      return included.has(c.sourceId) && included.has(c.targetId)
    }))
    if (focusMode && selected && nodes.length > visible.length) {
      return full
    }
    return full
  }, [layout, visible, connections, focusMode, selected, nodes.length])

  useEffect(() => {
    if (layout === 'force' && nodes.length > 0) {
      setPositionsTick((t) => t + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, nodes.length])

  const [, setPositionsTick] = useState(0)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const selectedNode = selected ? byId.get(selected) : undefined
  const adj = useMemo(() => adjacency(nodes, connections), [nodes, connections])

  const highlight = useMemo(() => {
    if (!selected) return { nodes: new Set<string>(), edges: new Set<string>() }
    const nSet = new Set<string>([selected, ...(adj.get(selected) ?? [])])
    const eSet = new Set<string>()
    for (const c of connections) {
      if ((c.sourceId === selected && nSet.has(c.targetId)) || (c.targetId === selected && nSet.has(c.sourceId))) eSet.add(c.id)
    }
    return { nodes: nSet, edges: eSet }
  }, [selected, adj, connections])

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    let panning = false
    let startX = 0
    let startY = 0
    const onDown = (e: PointerEvent) => {
      if (e.target !== el) return
      panning = true
      startX = e.clientX - view.x
      startY = e.clientY - view.y
    }
    const onMove = (e: PointerEvent) => {
      if (!panning) return
      setView((v) => ({ ...v, x: e.clientX - startX, y: e.clientY - startY }))
    }
    const onUp = () => { panning = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.08 : 0.93
      setView((v) => {
        const zoom = Math.min(2.5, Math.max(0.15, v.zoom * factor))
        const el = svgRef.current
        if (!el) return { ...v, zoom }
        const rect = el.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const k = zoom / v.zoom
        return { zoom, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }
      })
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [view])

  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const manualPos = useRef(new Map<string, { x: number; y: number }>())
  const nodePos = (n: KnowledgeNode) => {
    const p = positions.get(n.id) ?? { x: CANVAS_W / 2, y: CANVAS_H / 2 }
    const userPatch = manualPos.current.get(n.id)
    return userPatch ?? p
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragState.current
      if (!d) return
      const el = svgRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const mx = (e.clientX - rect.left - view.x) / view.zoom
      const my = (e.clientY - rect.top - view.y) / view.zoom
      manualPos.current.set(d.id, { x: mx - d.dx, y: my - d.dy })
      setPositionsTick((t) => t + 1)
    }
    const onUp = () => { dragState.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [view])

  const visibleEdges = useMemo(() => {
    const included = new Set(visible.map((n) => n.id))
    return connections.filter((c) => included.has(c.sourceId) && included.has(c.targetId))
  }, [connections, visible])

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (pendingFrom) {
      if (pendingFrom !== id) void addConnection(pendingFrom, id, 'is-related-to')
      setPendingFrom(null)
      return
    }
    setSelected((s) => (s === id ? null : id))
  }

  return (
    <div className="flex h-full">
      <div className="relative flex-1 bg-app">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
          style={{ zIndex: 5 }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {visibleEdges.map((c) => {
              const src = visible.find((n) => n.id === c.sourceId)
              const dst = visible.find((n) => n.id === c.targetId)
              if (!src || !dst) return null
              const p1 = nodePos(src)
              const p2 = nodePos(dst)
              const active = highlight.edges.has(c.id)
              const dimming = selected && !active
              return (
                <g key={c.id} style={{ pointerEvents: 'none' }}>
                  <defs>
                    <marker id={`arrow-${c.id}`} viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill={active ? 'var(--color-accent)' : 'var(--color-ink-3)'} />
                    </marker>
                  </defs>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={active ? 'var(--color-accent)' : 'var(--color-ink-3)'}
                    strokeOpacity={dimming ? 0.12 : active ? 0.9 : 0.35}
                    strokeWidth={active ? 1.8 : 1.1}
                    markerEnd={`url(#arrow-${c.id})`}
                  />
                  {active && (
                    <text
                      x={(p1.x + p2.x) / 2}
                      y={(p1.y + p2.y) / 2 - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--color-accent)"
                      style={{ userSelect: 'none' }}
                    >
                      {c.type.replace(/-/g, ' ')}
                    </text>
                  )}
                </g>
              )
            })}
            {visible.map((n) => {
              const p = nodePos(n)
              const color = KIND_COLORS[n.kind]
              const isActive = highlight.nodes.has(n.id) && selected
              const dimming = selected && !highlight.nodes.has(n.id)
              const r = 13 + n.importance * 2.5
              const isPending = pendingFrom === n.id
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className="cursor-pointer"
                  style={{ opacity: dimming ? 0.18 : 1 }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    dragState.current = { id: n.id, dx: p.x, dy: p.y }
                  }}
                  onPointerUp={() => { dragState.current = null }}
                  onClick={(e) => handleNodeClick(n.id, e)}
                >
                  {n.importance === 3 && <circle r={r + 9} fill="none" stroke={color} strokeOpacity={0.25} strokeDasharray="2 4" />}
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={isActive ? 0.95 : 0.75}
                    stroke={isPending ? '#fff' : color}
                    strokeWidth={selected === n.id ? 2.5 : 1.4}
                  />
                  <text y={r + 14} textAnchor="middle" fontSize={11} fill="var(--color-ink)" style={{ userSelect: 'none' }}>
                    {n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>


        <GraphToolbar
          layout={layout}
          setLayout={setLayout}
          zoomIn={() => setView((v) => ({ ...v, zoom: Math.min(2.5, v.zoom * 1.2) }))}
          zoomOut={() => setView((v) => ({ ...v, zoom: Math.max(0.15, v.zoom / 1.2) }))}
          reset={() => setView({ x: 0, y: 0, zoom: 1 })}
          fit={() => {
            if (visible.length === 0) return setView({ x: 0, y: 0, zoom: 1 })
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const n of visible) { const p = nodePos(n); minX = Math.min(minX, p.x - 60); maxX = Math.max(maxX, p.x + 60); minY = Math.min(minY, p.y - 40); maxY = Math.max(maxY, p.y + 40) }
            const rect = containerRef.current?.getBoundingClientRect()
            const w = rect?.width ?? 1200
            const h = rect?.height ?? 800
            const zoom = Math.min(w / (maxX - minX), h / (maxY - minY), 2)
            setView({ zoom, x: w / 2 - ((minX + maxX) / 2) * zoom, y: h / 2 - ((minY + maxY) / 2) * zoom })
          }}
          focusMode={focusMode}
          toggleFocus={() => setFocusMode((f) => !f)}
          pendingMode={!!pendingFrom}
          cancelPending={() => setPendingFrom(null)}
          toggleFilters={() => setShowFilters((f) => !f)}
          filtersActive={kindFilter.length > 0 || tagFilter.length > 0 || filterQuery.length > 0}
          addQuickNode={async () => {
            const n = await addNode(`New node ${nodes.length + 1}`)
            setSelected(n.id)
          }}
          count={visible.length}
        />

        {showFilters && (
          <div className="animate-fade-in absolute top-16 left-1/2 z-20 w-[420px] -translate-x-1/2 rounded-lg border border-hair bg-panel p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-2">Filters</span>
              <button className="text-ink-3 hover:text-ink" onClick={() => setShowFilters(false)}><X size={14} /></button>
            </div>
            <input
              className="mb-2 w-full rounded-md border border-hair bg-panel-2 px-2 py-1 text-xs outline-none"
              placeholder="Search titles, content, tags…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
            <div className="mb-2 flex flex-wrap gap-1">
              {NODE_KINDS.map((k) => (
                <button
                  key={k}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${kindFilter.includes(k) ? 'border-transparent' : 'border-hair text-ink-2'}`}
                  style={kindFilter.includes(k) ? { background: `${KIND_COLORS[k]}30`, color: KIND_COLORS[k] } : undefined}
                  onClick={() => setKindFilter((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]))}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.map((t) => (
                <button
                  key={t}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${tagFilter.includes(t) ? 'border-accent text-accent' : 'border-hair text-ink-2'}`}
                  onClick={() => setTagFilter((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]))}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {pendingFrom && (
          <div className="animate-fade-in absolute bottom-6 left-1/2 z-20 rounded-full border border-accent bg-panel px-4 py-2 text-xs text-ink shadow-xl">
            Click a second node to create a connection · <button className="text-accent" onClick={() => setPendingFrom(null)}>cancel</button>
          </div>
        )}


      </div>

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          nodes={nodes}
          connections={connections}
          onClose={() => setSelected(null)}
          onFocus={(id) => setSelected(id)}
        />
      )}
    </div>
  )
}

function GraphToolbar({
  layout, setLayout, zoomIn, zoomOut, reset, fit, focusMode, toggleFocus, pendingMode, cancelPending, toggleFilters, filtersActive, addQuickNode, count,
}: {
  layout: GraphLayoutKind
  setLayout: (l: GraphLayoutKind) => void
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fit: () => void
  focusMode: boolean
  toggleFocus: () => void
  pendingMode: boolean
  cancelPending: () => void
  toggleFilters: () => void
  filtersActive: boolean
  addQuickNode: () => Promise<void>
  count: number
}) {
  return (
    <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-hair bg-panel/95 px-2 py-1.5 shadow-lg">
      <Select value={layout} onChange={(e) => setLayout(e.target.value as GraphLayoutKind)} className="!w-auto text-xs">
        <option value="force">Force-directed</option>
        <option value="radial">Radial mind map</option>
        <option value="hierarchical">Hierarchical tree</option>
        <option value="circular">Circular</option>
        <option value="timeline">Timeline</option>
      </Select>
      <Button variant="ghost" onClick={zoomIn} title="Zoom in"><ZoomIn size={15} /></Button>
      <Button variant="ghost" onClick={zoomOut} title="Zoom out"><ZoomOut size={15} /></Button>
      <Button variant="ghost" onClick={fit} title="Fit view"><Maximize size={15} /></Button>
      <Button variant="ghost" onClick={reset} title="Reset view"><Crosshair size={15} /></Button>
      <div className="mx-1 h-5 w-px bg-hair" />
      <Button variant={pendingMode ? 'primary' : 'ghost'} onClick={pendingMode ? cancelPending : undefined} title="Connect two nodes">
        {pendingMode ? <X size={15} /> : <Link2 size={15} />}
      </Button>
      <Button variant={focusMode ? 'primary' : 'ghost'} onClick={toggleFocus} title="Focus mode: show only selected and its neighbours">Focus</Button>
      <Button variant={filtersActive ? 'primary' : 'ghost'} onClick={toggleFilters} title="Filters"><Filter size={15} /></Button>
      <Button variant="primary" onClick={() => void addQuickNode()} title="Add node"><Rocket size={14} /><span className="text-xs">Node</span></Button>
      <span className="ml-1 text-[10px] text-ink-3">{count}</span>
    </div>
  )
}
