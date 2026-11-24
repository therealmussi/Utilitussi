import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, Plus, Undo2, Redo2, Trash2, ChevronsLeftRight } from 'lucide-react'
import type { MindMap, MindMapNode } from '@/types'
import { uid } from '@/services/factory'
import { Button, Input, Select, Textarea } from '@/components/ui'

const COLORS = ['#4f8cff', '#3ecfa0', '#e5b567', '#e98cb0', '#a78bfa', '#f07f6a', '#7cc7a8', '#ffd166']
const LEVEL_W = 190
const NODE_H = 34
const NODE_GAP = 14

export function MindMapEditor({ map, onSave, onBack }: { map: MindMap; onSave: (m: MindMap) => void; onBack: () => void }) {
  const [nodes, setNodesState] = useState<MindMapNode[]>(map.nodes)
  const undoStack = useRef<MindMapNode[][]>([])
  const redoStack = useRef<MindMapNode[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(map.nodes[0]?.id ?? null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setNodesState(map.nodes)
    setSelectedId(map.nodes[0]?.id ?? null)
    undoStack.current = []
    redoStack.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id])

  const commit = (next: MindMapNode[]) => {
    undoStack.current.push(nodes)
    if (undoStack.current.length > 80) undoStack.current.shift()
    redoStack.current = []
    setNodesState(next)
    onSave({ ...map, nodes: next, updatedAt: new Date().toISOString() })
  }

  const undo = () => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(nodes)
    setNodesState(prev)
    onSave({ ...map, nodes: prev })
  }
  const redo = () => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(nodes)
    setNodesState(next)
    onSave({ ...map, nodes: next })
  }

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const childrenOf = useMemo(() => {
    const m = new Map<string, MindMapNode[]>()
    for (const n of nodes) {
      const key = n.parentId ?? ''
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(n)
    }
    for (const list of m.values()) list.sort((a, b) => (a.y ?? 0) - (b.y ?? 0))
    return m
  }, [nodes])
  const root = nodes.find((n) => n.parentId === null)

  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    if (!root) return pos
    let cursorY = 0
    const walk = (node: MindMapNode, depth: number): number => {
      const manual = node.x != null && node.y != null
      if (manual) {
        pos.set(node.id, { x: node.x!, y: node.y! })
        return node.y!
      }
      const kids = node.collapsed ? [] : childrenOf.get(node.id) ?? []
      if (kids.length === 0) {
        pos.set(node.id, { x: depth * LEVEL_W, y: cursorY })
        const taken = cursorY
        cursorY += NODE_H + NODE_GAP
        return taken
      }
      const ys = kids.map((k) => walk(k, depth + 1))
      const y = (Math.min(...ys) + Math.max(...ys)) / 2
      pos.set(node.id, { x: depth * LEVEL_W, y })
      return y
    }
    const rootY = walk(root, 0)
    if (root.x == null) {
      const minY = Math.min(...[...pos.values()].map((p) => p.y))
      for (const [id, p] of pos) pos.set(id, { x: p.x, y: p.y - minY })
      pos.set(root.id, { x: 0, y: rootY - minY || 200 })
    }
    return pos
  }, [root, childrenOf, nodes])

  const addChild = (parentId: string | null, text = 'New idea', color?: string) => {
    if (parentId === null && root) return
    const node: MindMapNode = {
      id: uid('mm_'),
      parentId: parentId ?? null,
      text,
      note: '',
      color: color ?? COLORS[(childrenOf.get(parentId ?? '')?.length ?? 0) % COLORS.length],
      collapsed: false,
    }
    commit([...nodes, node])
    setSelectedId(node.id)
  }

  const addSibling = (node: MindMapNode) => {
    if (node.parentId === null) return
    addChild(node.parentId, 'New idea', node.color)
  }

  const updateNode = (id: string, patch: Partial<MindMapNode>) => {
    commit(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  const deleteNode = (id: string) => {
    const doomed = new Set<string>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const n of nodes) {
        if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
          doomed.add(n.id)
          grew = true
        }
      }
    }
    const next = nodes.filter((n) => !doomed.has(n.id))
    if (next.length === 0) return
    commit(next)
    if (selectedId && doomed.has(selectedId)) setSelectedId(next[0]?.id ?? null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      if (selectedId && e.key === 'Tab') { e.preventDefault(); addChild(selectedId) }
      if (selectedId && (e.key === 'Enter')) { e.preventDefault(); const n = byId.get(selectedId); if (n) addSibling(n) }
      if (selectedId && e.key === 'Delete' && selectedId !== root?.id) {
        e.preventDefault()
        deleteNode(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, nodes, byId])

  const exportSVG = () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', getComputedStyle(document.body).backgroundColor || '#0d1420')
    clone.insertBefore(bg, clone.firstChild)
    const data = new XMLSerializer().serializeToString(clone)
    downloadBlob(new Blob([data], { type: 'image/svg+xml' }), `${slug(map.title)}.svg`)
  }

  const exportPNG = () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const data = new XMLSerializer().serializeToString(clone)
    const img = new Image()
    const bbox = svgRef.current?.getBBox()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1200, Math.ceil((bbox?.width ?? 1200) + 200))
      canvas.height = Math.max(700, Math.ceil((bbox?.height ?? 700) + 150))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 60, 60)
      canvas.toBlob((b) => b && downloadBlob(b, `${slug(map.title)}.png`), 'image/png')
    }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`
  }

  const exportJSON = () => downloadBlob(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' }), `${slug(map.title)}.json`)

  const exportPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const svg = svgRef.current
    const data = svg ? new XMLSerializer().serializeToString(svg) : ''
    w.document.write(`<html><head><title>${map.title}</title></head><body><h1>${map.title}</h1>${data}</body></html>`)
    w.document.close()
    w.print()
  }

  const selected = selectedId ? byId.get(selectedId) : undefined

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hair bg-panel px-4 py-2.5">
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={14} /> All maps</Button>
        <span className="text-sm font-semibold">{map.title}</span>
        <span className="text-[10px] text-ink-3">{nodes.length} nodes</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" onClick={undo} title="Undo"><Undo2 size={14} /></Button>
          <Button variant="ghost" onClick={redo} title="Redo"><Redo2 size={14} /></Button>
          {selected && selectedId !== root?.id && (
            <Button variant="ghost" onClick={() => deleteNode(selectedId!)} title="Delete node"><Trash2 size={14} /></Button>
          )}
          <Select
            className="!w-28 text-xs"
            onChange={(e) => {
              if (e.target.value === 'svg') exportSVG()
              if (e.target.value === 'png') exportPNG()
              if (e.target.value === 'json') exportJSON()
              if (e.target.value === 'pdf') exportPDF()
              e.target.value = ''
            }}
            value=""
          >
            <option value="" disabled><Download size={12} /> Export…</option>
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF (print)</option>
          </Select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto bg-app p-10">
          <svg ref={svgRef} className="rounded-lg">
            <g>
              {nodes.map((n) => {
                const p = layout.get(n.id)
                if (!p) return null
                const parent = n.parentId ? byId.get(n.parentId) : undefined
                const pp = n.parentId ? layout.get(n.parentId) : undefined
                const x1 = (pp?.x ?? 0) + 170
                const y1 = pp?.y ?? 0
                const stroke = n.color ?? byId.get(n.id)?.color ?? '#4f8cff'
                return (
                  <g key={n.id}>
                    {n.parentId && (
                      <path
                        d={`M ${x1} ${y1} C ${x1 + (p.x - x1) / 2} ${y1}, ${x1 + (p.x - x1) / 2} ${p.y}, ${p.x} ${p.y}`}
                        fill="none"
                        stroke={stroke}
                        strokeOpacity={0.55}
                        strokeWidth={2}
                      />
                    )}
                  </g>
                )
              })}
              {nodes.map((n) => {
                const p = layout.get(n.id)
                if (!p) return null
                const isRoot = n.parentId === null
                const w = isRoot ? 170 : 170
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y - NODE_H / 2})`}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(n.id)}
                  >
                    <rect
                      width={w}
                      height={NODE_H}
                      rx={8}
                      fill={isRoot ? n.color : '#ffffff10'}
                      stroke={n.color}
                      strokeWidth={selectedId === n.id ? 2.4 : 1.1}
                    />
                    <text x={10} y={NODE_H / 2 + 4} fontSize={isRoot ? 13 : 11.5} fill={isRoot ? '#ffffff' : 'var(--color-ink)'}>
                      {n.collapsed && n.text ? `${n.text}  ›` : n.text}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        <div className="w-72 shrink-0 space-y-3 overflow-y-auto border-l border-hair bg-panel p-3">
          {selected ? (
            <>
              <div className="text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Selected node</div>
              <Input value={selected.text} onChange={(e) => updateNode(selected.id, { text: e.target.value })} placeholder="Text" />
              <Textarea rows={3} value={selected.note} onChange={(e) => updateNode(selected.id, { note: e.target.value })} placeholder="Note (hidden until selected)" />
              <Input value={selected.link ?? ''} onChange={(e) => updateNode(selected.id, { link: e.target.value || undefined })} placeholder="https://link…" />
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} className={`h-5 w-5 rounded-full border-2 ${selected.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} title={c} onClick={() => updateNode(selected.id, { color: c })} />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button variant="primary" className="flex-1" onClick={() => addChild(selected.id)}>Add child (Tab)</Button>
                <Button variant="outline" title="Add sibling" onClick={() => addSibling(selected)}>+</Button>
                <Button variant="outline" title="Collapse/expand branch" onClick={() => updateNode(selected.id, { collapsed: !selected.collapsed })}>
                  <ChevronsLeftRight size={13} />
                </Button>
              </div>
              {selected.parentId === null && <div className="text-[10px] text-ink-3">This is the root node of the map.</div>}
            </>
          ) : (
            <div className="text-xs text-ink-3">Select a node, or add the root node to start.</div>
          )}
          {!root && (
            <Button variant="primary" className="w-full" onClick={() => addChild(null, map.title || 'Central topic', COLORS[0])}>
              <Plus size={13} /> Create root node
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mindmap'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
