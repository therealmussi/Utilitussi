import { describe, expect, it } from 'vitest'
import { suggestConnections, findDuplicates, detectKnowledgeGaps, findIsolatedNodes } from './discovery'
import { makeConnection, makeNode } from '@/services/factory'
import type { KnowledgeNode } from '@/types'

function node(title: string, content: string, tags: string[] = []): KnowledgeNode {
  return makeNode('u1', title, { content, tags })
}

describe('suggestConnections', () => {
  it('suggests a link between two entries sharing substantial vocabulary', () => {
    const a = node('Public transportation', 'Efficient transit systems move people in dense urban areas.')
    const b = node('Urban density', 'Dense cities concentrate potential users of transit and public transportation.')
    const suggestions = suggestConnections([a, b], [], 10, 0.01)
    expect(suggestions.some((s) => (s.sourceId === a.id && s.targetId === b.id))).toBe(true)
  })

  it('never suggests an already existing connection pair', () => {
    const a = node('Transit', 'transit systems move people efficiently in cities')
    const b = node('Density', 'dense city areas concentrate transit users')
    const conn = makeConnection('u1', a.id, b.id, 'is-related-to')
    const suggestions = suggestConnections([a, b], [conn], 10, 0.01)
    expect(suggestions.find((s) => s.sourceId === a.id && s.targetId === b.id)).toBeUndefined()
  })

  it('boosts confidence through common neighbours', () => {
    const a = node('Transit systems', 'buses and metro lines')
    const b = node('Metro', 'metro and buses, urban transit rail')
    const hub = node('Mobility hub', 'transit stop integration')
    const conns = [
      makeConnection('u1', a.id, hub.id, 'is-part-of'),
      makeConnection('u1', b.id, hub.id, 'is-part-of'),
    ]
    const suggestions = suggestConnections([a, b, hub], conns, 10, 0.01)
    const s = suggestions.find((x) => x.sourceId === a.id && x.targetId === b.id)
    expect(s).toBeDefined()
    expect(s!.signals.some((sig) => sig.includes('neighbours'))).toBe(true)
  })

  it('attaches an inferred relation type', () => {
    const a = node('Carbon emissions', 'Emissions cause warming and lead to climate effects.')
    const b = node('Global warming', 'Warming results from the greenhouse effect.')
    const suggestions = suggestConnections([a, b], [], 10, 0.01)
    const s = suggestions.find((x) => x.sourceId === a.id && x.targetId === b.id)
    expect(s).toBeDefined()
    expect(['causes', 'influences']).toContain(s!.type)
  })
})

describe('findDuplicates', () => {
  it('detects repeated aliases like "Artificial Intelligence (AI)"', () => {
    const a = node('Artificial intelligence', 'Machines performing tasks that require intelligence.')
    const b = node('Artificial Intelligence (AI)', 'Machines performing tasks that require intelligence.')
    const dupes = findDuplicates([a, b])
    expect(dupes.length).toBeGreaterThanOrEqual(1)
    expect(dupes[0].score).toBeGreaterThanOrEqual(0.6)
  })

  it('detects abbreviation forms (AI = artificial intelligence)', () => {
    const a = node('Artificial intelligence', 'field of computer science')
    const b = node('AI', 'field of computer science')
    const dupes = findDuplicates([a, b])
    expect(dupes.length).toBe(1)
  })

  it('keeps distinct concepts apart', () => {
    const a = node('Quantum physics', 'Physics of very small scales and probabilities.')
    const b = node('Renaissance painting', 'Visual art movement in Europe during the fifteenth century.')
    expect(findDuplicates([a, b])).toHaveLength(0)
  })
})

describe('detectKnowledgeGaps', () => {
  it('finds missing core elements of a domain', () => {
    const a = node('Greenhouse gases', 'Gases trapping heat in the atmosphere.')
    const b = node('Global warming', 'The long-term rise in temperatures.')
    const gaps = detectKnowledgeGaps([a, b], 'Climate change')
    const titles = gaps.map((g) => g.standaloneTitle.toLowerCase())
    expect(titles).toContain('radiative forcing')
    expect(gaps.every((g) => g.reason.length > 0)).toBe(true)
  })

  it('returns no gap for a topic without any matching vocabulary', () => {
    const a = node('Sourdough baking', 'Fermented dough with wild yeast.')
    expect(detectKnowledgeGaps([a], 'Advanced origami')).toHaveLength(0)
  })
})

describe('findIsolatedNodes', () => {
  it('returns nodes without any connection', () => {
    const a = node('Island', 'nothing here')
    const b = node('Bridge', 'connects shores')
    const conn = makeConnection('u1', a.id, b.id)
    const c = node('Alone', 'no link at all')
    const result = findIsolatedNodes([a, b, c], [conn])
    expect(result.map((n) => n.title)).toEqual(['Alone'])
  })
})
