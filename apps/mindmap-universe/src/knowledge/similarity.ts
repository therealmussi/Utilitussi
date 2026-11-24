import type { KnowledgeNode, Connection, GraphQueryFilter } from '@/types'
import { extractKeywords } from '@/utils/text'

export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9\s\u00e0-\u00fc]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function titleTokens(t: string): string[] {
  const n = normalizeTitle(t)
  return n ? n.split(' ') : []
}

export function duplicateScore(a: KnowledgeNode, b: KnowledgeNode): number {
  const ta = new Set(titleTokens(a.title))
  const tb = new Set(titleTokens(b.title))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const jaccard = inter / (ta.size + tb.size - inter)
  const exact = normalizeTitle(a.title) === normalizeTitle(b.title) ? 1 : 0
  const abbr = isAbbreviation(a.title, b.title) ? 0.85 : 0
  return Math.max(exact, jaccard, abbr)
}

function isAbbreviation(a: string, b: string): boolean {
  const short = a.length < b.length ? a : b
  const long = a.length < b.length ? b : a
  const sn = normalizeTitle(short)
  const ln = normalizeTitle(long)
  if (sn.length < 2) return false
  if (ln.startsWith(sn + ' ')) return true
  const longWords = ln.split(' ')
  const longInitials = longWords.map((w) => w[0]).join('')
  if (sn === longInitials && longInitials.length >= 2) return true
  return sn.length >= 2 && ln.split(' ').every((w) => !sn.includes(w[0])) && ln.startsWith(sn.split(' ')[0])
}

export function nodeKeywords(n: KnowledgeNode): Set<string> {
  return new Set([...extractKeywords(n.title), ...extractKeywords(n.content), ...n.tags])
}

export function similarity(a: KnowledgeNode, b: KnowledgeNode): number {
  const kwA = nodeKeywords(a)
  const kwB = nodeKeywords(b)
  if (kwA.size === 0 || kwB.size === 0) return 0
  let inter = 0
  for (const k of kwA) if (kwB.has(k)) inter++
  const jaccard = inter / (kwA.size + kwB.size - inter)
  const tagA = new Set(a.tags.map((t) => t.toLowerCase()))
  const tagB = new Set(b.tags.map((t) => t.toLowerCase()))
  let tagInter = 0
  for (const t of tagA) if (tagB.has(t)) tagInter++
  const tagScore = tagA.size && tagB.size ? tagInter / Math.min(tagA.size, tagB.size) : 0
  return Math.min(1, 0.7 * jaccard + 0.3 * tagScore)
}

export function adjacency(nodes: KnowledgeNode[], connections: Connection[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const n of nodes) map.set(n.id, new Set())
  for (const c of connections) {
    map.get(c.sourceId)?.add(c.targetId)
    map.get(c.targetId)?.add(c.sourceId)
  }
  return map
}

export function searchNodes(
  nodes: KnowledgeNode[],
  filter: GraphQueryFilter,
): KnowledgeNode[] {
  const q = filter.query.trim().toLowerCase()
  return nodes.filter((n) => {
    if (filter.kinds.length > 0 && !filter.kinds.includes(n.kind)) return false
    if (filter.tags.length > 0 && !filter.tags.some((t) => n.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()))) return false
    if (!q) return true
    const haystack = `${n.title} ${n.content} ${n.tags.join(' ')} ${n.kind}`.toLowerCase()
    return haystack.includes(q)
  })
}

export function degree(nodes: KnowledgeNode[], connections: Connection[]): Map<string, number> {
  const d = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  for (const c of connections) {
    if (d.has(c.sourceId)) d.set(c.sourceId, (d.get(c.sourceId) ?? 0) + 1)
    if (d.has(c.targetId)) d.set(c.targetId, (d.get(c.targetId) ?? 0) + 1)
  }
  return d
}
