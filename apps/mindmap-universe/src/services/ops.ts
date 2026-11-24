import type { KnowledgeNode, Connection, LearningPath } from '@/types'
import { nowISO } from './factory'

export interface GraphDataset {
  nodes: KnowledgeNode[]
  connections: Connection[]
  learningPaths: LearningPath[]
}

export function deleteNodeCascade(
  data: GraphDataset,
  nodeId: string,
): GraphDataset {
  const nodes = data.nodes.filter((n) => n.id !== nodeId)
  const connections = data.connections.filter((c) => c.sourceId !== nodeId && c.targetId !== nodeId)
  const learningPaths = data.learningPaths.map((p) => {
    if (!p.itemIds.includes(nodeId)) return p
    const itemIds = p.itemIds.filter((id) => id !== nodeId)
    const { [nodeId]: _removed, ...rest } = p.items
    return { ...p, itemIds, items: rest }
  })
  return { nodes, connections, learningPaths }
}

export function removeCollectionReference(
  nodes: KnowledgeNode[],
  collectionId: string,
): KnowledgeNode[] {
  return nodes.map((n) =>
    n.collectionIds.includes(collectionId)
      ? { ...n, collectionIds: n.collectionIds.filter((c) => c !== collectionId), updatedAt: nowISO() }
      : n,
  )
}

export function removeSourceReference(
  nodes: KnowledgeNode[],
  sourceId: string,
): KnowledgeNode[] {
  return nodes.map((n) =>
    n.sourceIds.includes(sourceId)
      ? { ...n, sourceIds: n.sourceIds.filter((s) => s !== sourceId), updatedAt: nowISO() }
      : n,
  )
}

export function mergeNodes(
  data: GraphDataset,
  keepId: string,
  absorbId: string,
): GraphDataset {
  const keep = data.nodes.find((n) => n.id === keepId)
  const absorb = data.nodes.find((n) => n.id === absorbId)
  if (!keep || !absorb) return data
  if (keepId === absorbId) return data
  const seen = new Set<string>()
  const connections: Connection[] = []
  for (const c of data.connections) {
    let sourceId = c.sourceId
    let targetId = c.targetId
    if (sourceId === absorbId) sourceId = keepId
    if (targetId === absorbId) targetId = keepId
    if (sourceId === targetId) continue
    const key = `${sourceId}→${targetId}:${c.type}`
    if (seen.has(key)) continue
    seen.add(key)
    connections.push({ ...c, sourceId, targetId })
  }
  const tags = [...new Set([...keep.tags, ...absorb.tags])]
  const content = [keep.content, absorb.content].filter(Boolean).join('\n\n')
  const nodes = data.nodes
    .filter((n) => n.id !== absorbId)
    .map((n) => (n.id === keepId ? { ...n, tags, content, updatedAt: nowISO() } : n))
  const learningPaths = data.learningPaths.map((p) => {
    if (!p.itemIds.includes(absorbId)) return p
    const itemIds = p.itemIds.filter((id) => id !== absorbId)
    const items: LearningPath['items'] = { ...p.items }
    delete items[absorbId]
    const absorbedStatus = p.items[absorbId]?.status
    const keptStatus = items[keepId]?.status
    if (absorbedStatus && (!keptStatus || keptStatus === 'not-started')) items[keepId] = { status: absorbedStatus }
    return { ...p, itemIds, items }
  })
  return { nodes, connections, learningPaths }
}

export function reversedConnection(
  c: Connection,
): Connection {
  return { ...c, sourceId: c.targetId, targetId: c.sourceId }
}

export function undirectedKey(a: string, b: string, type: string): string {
  const [x, y] = a < b ? [a, b] : [b, a]
  return `${x}|${y}|${type}`
}

export function pruneOrphanConnections(
  data: GraphDataset,
): GraphDataset {
  const ids = new Set(data.nodes.map((n) => n.id))
  return { ...data, connections: data.connections.filter((c) => ids.has(c.sourceId) && ids.has(c.targetId)) }
}
