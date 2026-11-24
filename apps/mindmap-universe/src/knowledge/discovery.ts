import type { KnowledgeNode, Connection, RelationType } from '@/types'
import { similarity, duplicateScore, nodeKeywords, adjacency } from './similarity'
import { extractKeywords } from '@/utils/text'

export interface ConnectionSuggestion {
  sourceId: string
  targetId: string
  type: RelationType
  explanation: string
  confidence: number
  signals: string[]
}

const CAUSAL_HINTS = [
  'cause', 'effect', 'lead', 'result', 'driver', 'driven', 'increase', 'decrease', 'reduce', 'trigger',
  'because', 'due to', 'consequence', 'displace', 'boost', 'concentrate', 'prevent', 'enable',
]
const CONTRADICTION_HINTS = ['against', 'however', 'contradict', 'critic', 'alternative', 'debate', 'challenge', 'oppose']
const PART_HINTS = ['part', 'component', 'aspect', 'branch', 'subcategory', 'subset', 'field', 'domain']

function isCausal(text: string): boolean {
  const lower = text.toLowerCase()
  const heur = (ws: string[]) => ws.some((w) => lower.includes(w))
  if (heur(CONTRADICTION_HINTS)) return false
  return CAUSAL_HINTS.some((w) => lower.includes(w))
}

function isContradictory(text: string): boolean {
  const lower = text.toLowerCase()
  return CONTRADICTION_HINTS.some((w) => lower.includes(w))
}

function isPartitive(text: string): boolean {
  const lower = text.toLowerCase()
  return PART_HINTS.some((w) => lower.includes(w))
}

function inferRelation(a: KnowledgeNode, b: KnowledgeNode): RelationType {
  const text = `${a.title} ${a.content} ${b.title}`
  if (isContradictory(text)) return 'contradicts'
  if (isPartitive(a.content + ' ' + a.title) && b.kind === 'concept') return 'is-part-of'
  if (isCausal(text)) return 'influences'
  return 'is-related-to'
}

function buildExplanation(
  a: KnowledgeNode,
  b: KnowledgeNode,
  type: RelationType,
  shared: string[],
): string {
  const sharedText = shared.length > 0 ? `Both mention ${shared.slice(0, 3).map((s) => `"${s}"`).join(', ')}.` : ''
  switch (type) {
    case 'causes':
      return `Conceptual overlap suggests a causal link: ${a.title} appears in the same context as ${b.title} as condition or trigger. ${sharedText}`
    case 'contradicts':
      return `${a.title} and ${b.title} seem to involve contrasting positions or critiques. ${sharedText}`
    case 'is-part-of':
      return `${a.title} may be a component or sub-area of ${b.title}. ${sharedText}`
    default:
      return `${a.title} and ${b.title} share substantial conceptual ground and are worth connecting. ${sharedText}`
  }
}

export function suggestConnections(
  nodes: KnowledgeNode[],
  connections: Connection[],
  limit = 12,
  minConfidence = 0.12,
): ConnectionSuggestion[] {
  const adj = adjacency(nodes, connections)
  const linked = new Set<string>()
  for (const c of connections) {
    linked.add(`${c.sourceId}|${c.targetId}`)
    linked.add(`${c.targetId}|${c.sourceId}`)
  }
  const suggestions: ConnectionSuggestion[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      if (linked.has(`${a.id}|${b.id}`)) continue
      const sharedNeighbors = [...(adj.get(a.id) ?? new Set())].filter((x) => (adj.get(b.id) ?? new Set()).has(x))
      const sim = similarity(a, b)
      if (sim < minConfidence && sharedNeighbors.length < 1) continue
      const keyA = nodeKeywords(a)
      const keyB = nodeKeywords(b)
      const shared = [...new Set([...keyA, ...keyB])].filter((k) => keyA.has(k) && keyB.has(k) && k.length >= 4)
      const tagA = new Set(a.tags)
      const sharedTags = a.tags.filter((t) => b.tags.includes(t))
      const confidence = Math.min(1, sim + (sharedNeighbors.length > 0 ? 0.18 * Math.min(sharedNeighbors.length, 3) : 0) + sharedTags.length * 0.05)
      if (confidence < minConfidence) continue
      const type = inferRelation(a, b)
      const signals: string[] = []
      if (sharedTags.length > 0) signals.push(`shared tags: ${sharedTags.join(', ')}`)
      if (shared.length > 0) signals.push(`${shared.length} shared concepts`)
      if (sharedNeighbors.length > 0) signals.push(`${sharedNeighbors.length} common neighbours`)
      suggestions.push({
        sourceId: a.id,
        targetId: b.id,
        type,
        explanation: buildExplanation(a, b, type, shared),
        confidence,
        signals,
      })
    }
  }
  return suggestions.sort((x, y) => y.confidence - x.confidence).slice(0, limit)
}

export interface DuplicateSuggestion {
  keepId: string
  absorbId: string
  score: number
}

export function findDuplicates(nodes: KnowledgeNode[], threshold = 0.6): DuplicateSuggestion[] {
  const out: DuplicateSuggestion[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const score = duplicateScore(nodes[i], nodes[j])
      if (score >= threshold) {
        out.push({
          keepId: nodes[i].createdAt < nodes[j].createdAt ? nodes[i].id : nodes[j].id,
          absorbId: nodes[i].createdAt < nodes[j].createdAt ? nodes[j].id : nodes[i].id,
          score,
        })
      }
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

export interface KnowledgeGap {
  standaloneTitle: string
  domain: string
  reason: string
}

export interface TopicSeed {
  domain: string
  keywords: string[]
  core: string[]
  related: string[]
}

export const TOPIC_SEEDS: TopicSeed[] = [
  {
    domain: 'climate science',
    keywords: ['climate', 'warming', 'greenhouse', 'carbon', 'emission', 'weather', 'glacier', 'sea level'],
    core: ['Greenhouse gases', 'Global warming', 'Radiative forcing', 'Climate feedback loops', 'Carbon sinks', 'Carbon cycle', 'Paleoclimatology'],
    related: ['Sea level rise', 'COP21 Paris Agreement', 'Climate mitigation', 'IPCC reports'],
  },
  {
    domain: 'urban planning',
    keywords: ['urban', 'city', 'cities', 'planning', 'zoning', 'land use', 'transport', 'mobility', 'gentrification'],
    core: ['Land use', 'Zoning', 'Urban density', 'Transportation networks', 'Housing policy', 'Gentrification', 'Urban sprawl', 'Sustainable mobility'],
    related: ['Environmental justice', 'Real estate economics', 'Urban ecology'],
  },
  {
    domain: 'world war II',
    keywords: ['war', 'world war', 'military', 'ww2', 'wwii', 'nazi', 'holocaust', 'battle'],
    core: ['Treaty of Versailles', 'Rise of totalitarianism', 'Appeasement policy', 'Home front', 'Holocaust', 'Atomic weapons', 'Yalta Conference'],
    related: ['Cold War origins', 'Economic war mobilization'],
  },
  {
    domain: 'artificial intelligence',
    keywords: ['ai', 'machine learning', 'neural', 'artificial intelligence', 'algorithm', 'deep learning'],
    core: ['Machine learning', 'Neural networks', 'Training data', 'Generalization', 'Bias in datasets', 'Reinforcement learning', 'Interpretability'],
    related: ['AI ethics', 'Compute economics'],
  },
  {
    domain: 'economics',
    keywords: ['economy', 'econom', 'market', 'capital', 'inflation', 'finance', 'trade'],
    core: ['Supply and demand', 'Market failure', 'Monetary policy', 'Fiscal policy', 'Externalities', 'Scarcity'],
    related: ['Political economy', 'Development economics'],
  },
]

function matchSeed(topic: string, text: string): TopicSeed | undefined {
  const tk = new Set(extractKeywords(`${topic} ${text}`, 40))
  let best: TopicSeed | undefined
  let bestScore = 0
  for (const seed of TOPIC_SEEDS) {
    let score = 0
    for (const kw of seed.keywords) {
      const parts = kw.split(' ')
      if (parts.every((p) => tk.has(p) || topic.toLowerCase().includes(p))) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = seed
    }
  }
  return bestScore >= 2 ? best : undefined
}

export function detectKnowledgeGaps(
  nodes: KnowledgeNode[],
  topic: string,
): KnowledgeGap[] {
  const allText = nodes.map((n) => `${n.title} ${n.content}`).join(' ')
  const seed = matchSeed(topic, allText)
  const gaps: KnowledgeGap[] = []
  if (!seed) return gaps
  const existingTitles = nodes.map((n) => n.title.toLowerCase())
  const domainNodes = nodes.filter((n) => seed.keywords.some((kw) => `${n.title} ${n.content}`.toLowerCase().includes(kw)))
  const pool = `${topic} ${domainNodes.map((n) => n.title).join(' ')}`
  const topicKeywords = seed.keywords.filter((kw) => pool.toLowerCase().includes(kw))
  if (topicKeywords.length === 0) return gaps
  for (const concept of seed.core) {
    if (!existingTitles.some((t) => t.includes(concept.toLowerCase().split(' ')[0]) || concept.toLowerCase().includes(t.split(' ')[0]))) {
      gaps.push({
        standaloneTitle: concept,
        domain: seed.domain,
        reason: `"${concept}" is a foundational element of ${seed.domain} that is not yet represented in your graph. Understanding it usually clarifies several of your existing entries.`,
      })
    }
  }
  return gaps.slice(0, 6)
}

export function findIsolatedNodes(nodes: KnowledgeNode[], connections: Connection[]): KnowledgeNode[] {
  const linked = new Set<string>()
  for (const c of connections) {
    linked.add(c.sourceId)
    linked.add(c.targetId)
  }
  return nodes.filter((n) => !linked.has(n.id))
}
