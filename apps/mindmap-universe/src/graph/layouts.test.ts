import { describe, expect, it } from 'vitest'
import { computeLayout, computeCircularLayout, computeForceLayout, computeTimelineLayout, computeRadialLayout } from './layouts'
import { makeConnection, makeNode } from '@/services/factory'
import type { GraphLayoutKind } from '@/types'
import { mergeNodes } from '@/services/ops'

function graphScenario() {
  const a = makeNode('u1', 'Root topic', { importance: 3 })
  const b = makeNode('u1', 'Child one')
  const c = makeNode('u1', 'Child two')
  const d = makeNode('u1', 'Orphan leaf')
  const conns = [makeConnection('u1', a.id, b.id, 'is-part-of'), makeConnection('u1', a.id, c.id, 'is-part-of')]
  return { nodes: [a, b, c, d], conns }
}

describe.each<GraphLayoutKind>(['force', 'radial', 'circular', 'hierarchical', 'timeline'])('layout: %s', (kind) => {
  it('produces a finite position for every node without changing the data', () => {
    const { nodes, conns } = graphScenario()
    const positions = computeLayout(kind, nodes, conns)
    expect(positions.size).toBe(4)
    for (const n of nodes) {
      const p = positions.get(n.id)
      expect(p).toBeDefined()
      expect(Number.isFinite(p!.x)).toBe(true)
      expect(Number.isFinite(p!.y)).toBe(true)
    }
    expect(nodes).toHaveLength(4)
    expect(conns).toHaveLength(2)
  })

  it('switching layouts keeps the same node ids mapped', () => {
    const { nodes, conns } = graphScenario()
    const first = computeLayout('force', nodes, conns)
    const second = computeLayout('radial', nodes, conns)
    expect([...first.keys()].sort()).toEqual([...second.keys()].sort())
  })
})

describe('computeCircularLayout', () => {
  it('places all nodes roughly at the same radius from the centre', () => {
    const { nodes } = graphScenario()
    const pos = computeCircularLayout(nodes, 1200, 800)
    const radius = Math.hypot(pos.get(nodes[0].id)!.x - 600, pos.get(nodes[0].id)!.y - 400)
    for (const n of nodes) {
      const r = Math.hypot(pos.get(n.id)!.x - 600, pos.get(n.id)!.y - 400)
      expect(r - radius).toBeCloseTo(0, 0)
    }
  })
})

describe('computeTimelineLayout', () => {
  it('orders dated nodes along the x axis', () => {
    const n1 = makeNode('u1', 'Event 1900')
    n1.metadata.date = '1900-05-01'
    const n2 = makeNode('u1', 'Event 1950')
    n2.metadata.date = '1950-05-01'
    const n3 = makeNode('u1', 'Event 2000')
    n3.metadata.date = '2000-05-01'
    const pos = computeTimelineLayout([n3, n1, n2], 1400, 800)
    expect(pos.get(n1.id)!.x).toBeLessThan(pos.get(n2.id)!.x)
    expect(pos.get(n2.id)!.x).toBeLessThan(pos.get(n3.id)!.x)
  })
})

describe('computeRadialLayout', () => {
  it('places the most connected node at the centre', () => {
    const { nodes, conns } = graphScenario()
    const pos = computeRadialLayout(nodes, conns, 1200, 800)
    const root = nodes[0]
    expect(pos.get(root.id)).toEqual({ x: 600, y: 400 })
  })
})

describe('computeForceLayout', () => {
  it('separates connected nodes less than unconnected ones on average', () => {
    const { nodes, conns } = graphScenario()
    const pos = computeForceLayout(nodes, conns, 300, 1400, 900)
    const d = (a: string, b: string) => {
      const pa = pos.get(a)!
      const pb = pos.get(b)!
      return Math.hypot(pa.x - pb.x, pa.y - pb.y)
    }
    const connectedDist = d(nodes[0].id, nodes[1].id) + d(nodes[0].id, nodes[2].id)
    const isolatedDist = d(nodes[0].id, nodes[3].id) + d(nodes[1].id, nodes[3].id)
    expect(isolatedDist).toBeGreaterThan(connectedDist * 0.25)
  })
})

describe('mergeNodes keeps graph usable for layouts', () => {
  it('merge does not create duplicate ids and layouts still cover all nodes', () => {
    const { nodes, conns } = graphScenario()
    const dup = makeNode('u1', 'root  topic')
    const merged = mergeNodes({ nodes: [...nodes, dup], connections: conns, learningPaths: [] }, nodes[0].id, dup.id)
    expect(merged.nodes).toHaveLength(4)
    const pos = computeLayout('force', merged.nodes, merged.connections)
    expect(pos.size).toBe(4)
  })
})
