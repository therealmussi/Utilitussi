import type { Connection, KnowledgeNode, GraphLayoutKind } from '@/types'
import { adjacency, degree } from '@/knowledge/similarity'

export interface Point { x: number; y: number }
export type Positions = Map<string, Point>

export function emptyPositions(nodes: KnowledgeNode[]): Positions {
  const p: Positions = new Map()
  nodes.forEach((n, i) => p.set(n.id, { x: Math.cos((i / Math.max(nodes.length, 1)) * Math.PI * 2) * 200, y: Math.sin((i / Math.max(nodes.length, 1)) * Math.PI * 2) * 200 }))
  return p
}

export function computeForceLayout(
  nodes: KnowledgeNode[],
  connections: Connection[],
  iterations = 260,
  width = 1200,
  height = 800,
): Positions {
  const p = emptyPositions(nodes)
  if (nodes.length === 0) return p
  const adj = adjacency(nodes, connections)
  const cx = width / 2
  const cy = height / 2
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1)) * 0.25
  const repulsion = k * k
  for (let iter = 0; iter < iterations; iter++) {
    const fx = new Map<string, number>()
    const fy = new Map<string, number>()
    for (const n of nodes) {
      fx.set(n.id, (cx - (p.get(n.id)?.x ?? cx)) * 0.25)
      fy.set(n.id, (cy - (p.get(n.id)?.y ?? cy)) * 0.25)
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      const pa = p.get(a.id)!
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const pb = p.get(b.id)!
        let dx = pa.x - pb.x
        let dy = pa.y - pb.y
        let distSq = dx * dx + dy * dy
        if (distSq < 1) {
          dx = (Math.random() - 0.5) * 4
          dy = (Math.random() - 0.5) * 4
          distSq = dx * dx + dy * dy
        }
        const dist = Math.sqrt(distSq)
        const force = repulsion / distSq
        const ux = dx / dist
        const uy = dy / dist
        fx.set(a.id, (fx.get(a.id) ?? 0) + ux * force)
        fy.set(a.id, (fy.get(a.id) ?? 0) + uy * force)
        fx.set(b.id, (fx.get(b.id) ?? 0) - ux * force)
        fy.set(b.id, (fy.get(b.id) ?? 0) - uy * force)
      }
    }
    for (const c of connections) {
      const pa = p.get(c.sourceId)
      const pb = p.get(c.targetId)
      if (!pa || !pb) continue
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const ideal = k * 2.4
      const force = (dist - ideal) * 0.02
      const ux = (dx / dist) * force
      const uy = (dy / dist) * force
      fx.set(c.sourceId, (fx.get(c.sourceId) ?? 0) + ux)
      fy.set(c.sourceId, (fy.get(c.sourceId) ?? 0) + uy)
      fx.set(c.targetId, (fx.get(c.targetId) ?? 0) - ux)
      fy.set(c.targetId, (fy.get(c.targetId) ?? 0) - uy)
    }
    const cooling = 1 - iter / iterations
    for (const n of nodes) {
      const pt = p.get(n.id)!
      const cap = 18 * cooling + 0.4
      const fxv = Math.max(-cap, Math.min(cap, fx.get(n.id) ?? 0))
      const fyv = Math.max(-cap, Math.min(cap, fy.get(n.id) ?? 0))
      pt.x += fxv
      pt.y += fyv
    }
  }
  return p
}

export function computeRadialLayout(
  nodes: KnowledgeNode[],
  connections: Connection[],
  width = 1200,
  height = 800,
): Positions {
  const p: Positions = new Map()
  if (nodes.length === 0) return p
  const deg = degree(nodes, connections)
  const root = [...nodes].sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0))[0]
  const adj = adjacency(nodes, connections)
  const depthMap = new Map<string, number>()
  depthMap.set(root.id, 0)
  let frontier = [root.id]
  while (frontier.length > 0) {
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!depthMap.has(nb)) {
          depthMap.set(nb, (depthMap.get(id) ?? 0) + 1)
          next.push(nb)
        }
      }
    }
    frontier = next
  }
  const maxDepth = Math.max(...[...depthMap.values()], 1)
  const rings = new Map<number, string[]>()
  for (const n of nodes) {
    const d = depthMap.get(n.id) ?? maxDepth + 1
    if (!rings.has(d)) rings.set(d, [])
    rings.get(d)!.push(n.id)
  }
  p.set(root.id, { x: width / 2, y: height / 2 })
  for (const [d, ids] of rings) {
    if (d === 0 && ids.length === 1) continue
    const radius = d === maxDepth + 1 ? 420 : d * (Math.min(width, height) / 3.2) / Math.max(maxDepth, 1) + 90
    ids.forEach((id, i) => {
      const angle = (i / ids.length) * Math.PI * 2
      p.set(id, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius })
    })
  }
  return p
}

export function computeCircularLayout(nodes: KnowledgeNode[], width = 1200, height = 800): Positions {
  const p: Positions = new Map()
  const radius = Math.min(width, height) / 2 - 60
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2
    p.set(n.id, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius })
  })
  return p
}

export function computeHierarchicalLayout(nodes: KnowledgeNode[], connections: Connection[], width = 1200, height = 800): Positions {
  const p: Positions = new Map()
  if (nodes.length === 0) return p
  const deg = degree(nodes, connections)
  const adj = adjacency(nodes, connections)
  const root = [...nodes].sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0))[0]
  const seen = new Set([root.id])
  const levels: string[][] = [[root.id]]
  let current = [root.id]
  while (current.length > 0) {
    const next: string[] = []
    for (const id of current) {
      for (const nb of adj.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          next.push(nb)
        }
      }
    }
    if (next.length > 0) levels.push(next)
    current = next
  }
  const orphans = nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)
  const maxLevel = Math.max(levels.length, 1)
  levels.forEach((level, li) => {
    const y = (height / (maxLevel + 1)) * (li + 1)
    level.forEach((id, i) => {
      p.set(id, { x: (width / (level.length + 1)) * (i + 1), y })
    })
  })
  orphans.forEach((id, i) => {
    p.set(id, { x: 40, y: (height / (orphans.length + 1)) * (i + 1) })
  })
  return p
}

export function computeTimelineLayout(nodes: KnowledgeNode[], width = 1400, height = 800): Positions {
  const p: Positions = new Map()
  const dated = nodes
    .filter((n) => n.metadata.date)
    .sort((a, b) => (a.metadata.date ?? '').localeCompare(b.metadata.date ?? ''))
  if (dated.length === 0) return computeCircularLayout(nodes, width, height)
  const t0 = new Date(dated[0].metadata.date!).getTime()
  const t1 = new Date(dated[dated.length - 1].metadata.date ?? dated[0].metadata.date!).getTime()
  const span = Math.max(t1 - t0, 1)
  const marginX = 100
  dated.forEach((n, i) => {
    const t = new Date(n.metadata.date!).getTime()
    const x = marginX + ((t - t0) / span) * (width - marginX * 2)
    const y = height / 2 + ((i % 5) - 2) * 90
    p.set(n.id, { x, y })
  })
  const undated = nodes.filter((n) => !n.metadata.date)
  undated.forEach((n, i) => {
    p.set(n.id, { x: marginX + ((i % 10) / 10) * (width - marginX * 2), y: height - 60 - Math.floor(i / 10) * 70 })
  })
  return p
}

export function computeLayout(
  kind: GraphLayoutKind,
  nodes: KnowledgeNode[],
  connections: Connection[],
): Positions {
  switch (kind) {
    case 'force': return computeForceLayout(nodes, connections)
    case 'radial': return computeRadialLayout(nodes, connections)
    case 'circular': return computeCircularLayout(nodes)
    case 'hierarchical': return computeHierarchicalLayout(nodes, connections)
    case 'timeline': return computeTimelineLayout(nodes)
    default: return computeForceLayout(nodes, connections)
  }
}
