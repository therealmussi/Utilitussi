import { describe, expect, it } from 'vitest'
import { localGenerateMap, localExpand, generateQuiz, climbPathOrder, answerFromKnowledge } from './localEngine'
import { makeConnection, makeNode } from '@/services/factory'

describe('localGenerateMap', () => {
  it('builds a reviewable map from a domain topic with connections to the root', () => {
    const map = localGenerateMap('The history of urban transportation')
    expect(map.nodes.length).toBeGreaterThanOrEqual(5)
    const root = map.nodes.find((n) => n.title.toLowerCase().includes('urban transportation'))!
    expect(root).toBeDefined()
    for (const n of map.nodes.slice(1)) {
      expect(n.connectTo?.[0]).toBe(root.title)
      expect(n.relation).toBeTruthy()
    }
    expect(map.explanation).toContain('not verified knowledge')
  })

  it('falls back to a generic scaffold for unknown topics', () => {
    const map = localGenerateMap('Quantum beekeeping')
    expect(map.nodes.length).toBeGreaterThanOrEqual(4)
    expect(map.nodes.some((n) => n.title.includes('Definition'))).toBe(true)
  })
})

describe('localExpand', () => {
  it('proposes concepts from the node vocabulary without duplicating existing siblings', () => {
    const node = makeNode('u1', 'Gentrification', { content: 'displacement rent income influx neighbourhood housing prices', tags: ['economics'] })
    const siblings = [makeNode('u1', 'Rent prices')]
    const proposals = localExpand(node, siblings)
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals.length).toBeLessThanOrEqual(5)
    for (const p of proposals) {
      expect(p.title.toLowerCase()).not.toBe('rent prices')
      expect(p.connectTo).toContain('Gentrification')
    }
  })
})

describe('generateQuiz', () => {
  it('creates multiple-choice questions only from real entries', () => {
    const nodes = [
      makeNode('u1', 'Gentrification', { content: 'Transformation of neighbourhoods driven by capital influx and displacement.' }),
      makeNode('u1', 'Zoning', { content: 'Legal regulation of land use in cities.' }),
      makeNode('u1', 'Urban density', { content: 'Inhabitants per unit of area, viability of transit.' }),
      makeNode('u1', 'Radiative forcing', { content: 'Energy imbalance driving climate change.' }),
    ]
    const quiz = generateQuiz(nodes, 8)
    expect(quiz.length).toBeGreaterThanOrEqual(2)
    for (const q of quiz) {
      expect(q.options).toHaveLength(4)
      expect(q.options).toContain(q.options[q.answerIndex])
      expect(nodes.some((n) => n.title === q.options[q.answerIndex])).toBe(true)
    }
  })
})

describe('climbPathOrder', () => {
  it('walks breadth-first from the root through saved connections', () => {
    const a = makeNode('u1', 'Root')
    const b = makeNode('u1', 'Level 1')
    const c = makeNode('u1', 'Level 2 deep')
    const lone = makeNode('u1', 'Unlinked')
    const conns = [makeConnection('u1', a.id, b.id, 'is-part-of'), makeConnection('u1', b.id, c.id, 'depends-on')]
    const order = climbPathOrder(a.id, [a, b, c, lone], conns)
    expect(order[0].id).toBe(a.id)
    expect(order[1].id).toBe(b.id)
    expect(order[2].id).toBe(c.id)
    expect(order[3].id).toBe(lone.id)
  })
})

describe('answerFromKnowledge', () => {
  it('answers with saved entries and reports which entries were used', () => {
    const a = makeNode('u1', 'Gentrification', { content: 'Displacement of residents driven by rising housing prices in cities.' })
    const b = makeNode('u1', 'Radiative forcing', { content: 'Energy imbalance at the top of the atmosphere.' })
    const res = answerFromKnowledge('What do I know about gentrification and displacement?', [a, b], [])
    expect(res.usedNodes.map((n) => n.title)).toContain('Gentrification')
    expect(res.usedNodes.map((n) => n.title)).not.toContain('Radiative forcing')
    expect(res.answer).toContain('Based on your saved knowledge')
  })

  it('clearly says when nothing is stored', () => {
    const res = answerFromKnowledge('What is xylophonic meteorology?', [], [])
    expect(res.usedNodes).toHaveLength(0)
  })
})
