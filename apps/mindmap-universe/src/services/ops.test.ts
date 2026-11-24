import { describe, expect, it } from 'vitest'
import { deleteNodeCascade, removeCollectionReference, removeSourceReference, mergeNodes } from './ops'
import type { Connection, KnowledgeNode, LearningPath } from '@/types'
import { makeConnection, makeNode } from '@/services/factory'

function fixture(): { nodes: KnowledgeNode[]; connections: Connection[]; learningPaths: LearningPath[] } {
  const a = makeNode('u1', 'Urban density')
  const b = makeNode('u1', 'Public transportation')
  const c = makeNode('u1', 'Gentrification')
  const ab = makeConnection('u1', a.id, b.id, 'influences')
  const bc = makeConnection('u1', b.id, c.id, 'causes')
  return {
    nodes: [a, b, c],
    connections: [ab, bc],
    learningPaths: [{
      id: 'lp1', universeId: 'u1', title: 'Urban studies', description: '', itemIds: [a.id, b.id, c.id],
      items: { [a.id]: { status: 'understood' }, [b.id]: { status: 'not-started' } },
      createdAt: '2024-01-01T00:00:00Z',
    }],
  }
}

describe('deleteNodeCascade', () => {
  it('removes the node and every connection referencing it', () => {
    const data = fixture()
    const mid = data.nodes[1].id
    const next = deleteNodeCascade(data, mid)
    expect(next.nodes.length).toBe(2)
    expect(next.connections).toHaveLength(0)
  })

  it('removes the node from learning path item lists', () => {
    const data = fixture()
    const mid = data.nodes[1].id
    const next = deleteNodeCascade(data, mid)
    expect(next.learningPaths[0].itemIds).toHaveLength(2)
    expect(next.learningPaths[0].itemIds).not.toContain(mid)
  })

  it('deleting a leaf keeps remaining connections intact', () => {
    const data = fixture()
    const leaf = data.nodes[2].id
    const next = deleteNodeCascade(data, leaf)
    expect(next.connections).toHaveLength(1)
    expect(next.connections[0].sourceId).toBe(data.nodes[0].id)
    expect(next.connections[0].targetId).toBe(data.nodes[1].id)
  })
})

describe('mergeNodes', () => {
  it('rewires absorbed connections onto the kept node without self-loops', () => {
    const data = fixture()
    const [a, b] = data.nodes
    const copy: typeof data = {
      ...data,
      nodes: [...data.nodes, makeNode('u1', 'AI')],
    }
    // connect b to the duplicate
    copy.connections.push(makeConnection('u1', copy.nodes[3].id, b.id, 'is-related-to'))
    const next = mergeNodes(copy, a.id, copy.nodes[3].id)
    expect(next.nodes.find((n) => n.id === copy.nodes[3].id)).toBeUndefined()
    expect(next.connections.every((c) => c.sourceId !== copy.nodes[3].id && c.targetId !== copy.nodes[3].id)).toBe(true)
  })

  it('merges tags and content', () => {
    const data = fixture()
    const [a, b] = data.nodes
    const copy = { ...data, nodes: [a, { ...b, tags: ['mobility', 'extra'] }, data.nodes[2]] }
    const next = mergeNodes(copy, a.id, b.id)
    const kept = next.nodes.find((n) => n.id === a.id)!
    expect(kept.tags).toContain('mobility')
    expect(kept.tags).toContain('extra')
  })

  it('preserves relationships when merging aliased concepts', () => {
    const data = fixture()
    const [a, b, c] = data.nodes
    const next = mergeNodes(data, a.id, b.id)
    const kept = next.nodes.find((n) => n.id === a.id)!
    const toC = next.connections.find((x) => (x.sourceId === kept.id || x.targetId === kept.id) && (x.sourceId === c.id || x.targetId === c.id))
    expect(next.connections.length).toBeGreaterThanOrEqual(1)
    expect(toC).toBeDefined()
  })
})

describe('references cleanup', () => {
  it('removeCollectionReference strips the collection from all nodes', () => {
    const data = fixture()
    const [a, b] = data.nodes
    const copy = { ...data, nodes: [{ ...a, collectionIds: ['col1'] }, b] }
    const next = removeCollectionReference(copy.nodes, 'col1')
    expect(next[0].collectionIds).toHaveLength(0)
    expect(next[1].collectionIds).toHaveLength(0)
  })

  it('removeSourceReference strips the source id from nodes', () => {
    const data = fixture()
    const [a, b] = data.nodes
    const copy = { ...data, nodes: [{ ...a, sourceIds: ['s1'] }, b] }
    const next = removeSourceReference(copy.nodes, 's1')
    expect(next[0].sourceIds).toHaveLength(0)
  })
})
