import type { KnowledgeNode, Connection } from '@/types'
import { extractKeywords, titleCase, truncate } from '@/utils/text'
import { nodeKeywords } from '@/knowledge/similarity'
import { TOPIC_SEEDS, type TopicSeed } from '@/knowledge/discovery'
import { adjacency } from '@/knowledge/similarity'

export interface ProposedNode {
  title: string
  kind: 'concept' | 'event' | 'person' | 'place' | 'definition' | 'question'
  content: string
  tags: string[]
  connectTo?: string[]
  relation?: string
}

export interface ProposedMap {
  topic: string
  nodes: ProposedNode[]
  explanation: string
  engine: 'local' | 'remote'
}

function seedFor(topic: string): TopicSeed | undefined {
  const lower = topic.toLowerCase()
  for (const seed of TOPIC_SEEDS) {
    const matched = seed.keywords.filter((k) => lower.includes(k.split(' ')[0]) && k.split(' ')[0].length > 2)
    if (matched.length >= 1) return seed
  }
  return undefined
}

const GENERIC_SCAFFOLD: Array<{ suffix: string; kind: ProposedNode['kind']; hint: (t: string) => string }> = [
  { suffix: 'Definition and scope', kind: 'definition', hint: (t) => `What exactly ${t} covers, its boundaries and what it does not include.` },
  { suffix: 'Historical origins', kind: 'event', hint: (t) => `Key moments, decisive events and turning points in the development of ${t}.` },
  { suffix: 'Main actors', kind: 'person', hint: (t) => `The people, institutions or groups able to influence ${t}.` },
  { suffix: 'Core mechanisms', kind: 'concept', hint: (t) => `The internal processes and dynamics that make ${t} work.` },
  { suffix: 'Real-world examples', kind: 'question', hint: (t) => `Concrete cases, notable applications or famous experiments related to ${t}.` },
  { suffix: 'Open questions', kind: 'question', hint: (t) => `Debates, controversies and unsolved problems around ${t}.` },
  { suffix: 'Broader context', kind: 'concept', hint: (t) => `Neighbouring disciplines and larger systems that ${t} interacts with.` },
]

export function localGenerateMap(topic: string): ProposedMap {
  const seed = seedFor(topic)
  const nodes: ProposedNode[] = []
  const tags = seed ? seed.domain.split(' ').slice(0, 1).concat([topic.toLowerCase()]) : [topic.toLowerCase()]
  if (seed) {
    nodes.push({ title: titleCase(topic), kind: 'concept', content: `${titleCase(topic)} seen through the lens of ${seed.domain}.`, tags })
    for (const core of seed.core) {
      nodes.push({
        title: core,
        kind: 'concept',
        content: `Core element of ${seed.domain}: ${core}.`,
        tags,
        connectTo: [titleCase(topic)],
        relation: 'is-part-of',
      })
    }
    for (const related of seed.related) {
      nodes.push({
        title: related,
        kind: 'concept',
        content: `Adjacent theme: ${related}, useful to connect ${titleCase(topic)} with nearby fields.`,
        tags,
        connectTo: [titleCase(topic)],
        relation: 'is-related-to',
      })
    }
    return {
      topic,
      nodes,
      explanation: `Generated from the built-in domain profile for "${seed.domain}". Review, remove or edit each concept before saving. This is a deterministic local suggestion, not verified knowledge.`,
      engine: 'local',
    }
  }
  nodes.push({ title: titleCase(topic), kind: 'concept', content: `Central topic: ${topic}.`, tags })
  nodes.push(
    {
      title: `${titleCase(topic)} — Definition and scope`,
      kind: 'definition',
      content: GENERIC_SCAFFOLD[0].hint(topic),
      tags,
      connectTo: [titleCase(topic)],
      relation: 'is-part-of',
    },
    {
      title: `${titleCase(topic)} — Historical origins`,
      kind: 'event',
      content: GENERIC_SCAFFOLD[1].hint(topic),
      tags,
      connectTo: [titleCase(topic)],
      relation: 'is-part-of',
    },
    {
      title: `${titleCase(topic)} — Core mechanisms`,
      kind: 'concept',
      content: GENERIC_SCAFFOLD[3].hint(topic),
      tags,
      connectTo: [titleCase(topic)],
      relation: 'is-part-of',
    },
    {
      title: `${titleCase(topic)} — Open questions`,
      kind: 'question',
      content: GENERIC_SCAFFOLD[5].hint(topic),
      tags,
      connectTo: [titleCase(topic)],
      relation: 'is-related-to',
    },
  )
  return {
    topic,
    nodes,
    explanation: 'Built with the generic decomposition scaffold (definition, history, mechanisms, open questions). Connect an AI provider in Settings for richer results.',
    engine: 'local',
  }
}

export function localExpand(node: KnowledgeNode, siblings: KnowledgeNode[]): ProposedNode[] {
  const kw = [...nodeKeywords(node)].slice(0, 8)
  const nearbyTitles = siblings.slice(0, 4).map((s) => s.title)
  const proposals: ProposedNode[] = []
  const terms = kw.slice(0, 4).map(titleCase)
  for (const term of terms) {
    if (term.toLowerCase() === node.title.toLowerCase()) continue
    if (siblings.some((s) => s.title.toLowerCase().includes(term.toLowerCase()))) continue
    proposals.push({
      title: term,
      kind: 'concept',
      content: ` Emerging from "${node.title}": ${term} was repeatedly mentioned in your notes about it. Verify whether it deserves its own concept.`,
      tags: node.tags,
      connectTo: [node.title],
      relation: 'is-related-to',
    })
  }
  if (proposals.length === 0 && nearbyTitles.length > 0) {
    proposals.push({
      title: `${node.title} — Synthesis`,
      kind: 'definition',
      content: `A synthesis note bridging ${node.title} with ${nearbyTitles.join(', ')}.`,
      tags: node.tags,
      connectTo: [node.title],
      relation: 'is-related-to',
    })
  }
  return proposals.slice(0, 5)
}

export interface QuizQuestion {
  question: string
  options: string[]
  answerIndex: number
  sourceNodeTitle: string
}

export function generateQuiz(nodes: KnowledgeNode[], count = 8): QuizQuestion[] {
  const pool = nodes.filter((n) => n.content.trim().length > 20 || nodes.length > 3)
  const questions: QuizQuestion[] = []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  for (const node of shuffled) {
    if (questions.length >= count) break
    const question = node.content.trim().length > 20 ? node.content : node.title
    const answer = node.title
    const distractors = shuffled
      .filter((n) => n.id !== node.id && n.title !== answer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((n) => n.title)
    if (distractors.length < 2) continue
    const options = [answer, ...distractors].sort(() => Math.random() - 0.5)
    questions.push({
      question: `Which concept matches: "${truncate(question, 180)}"?`,
      options,
      answerIndex: options.indexOf(answer),
      sourceNodeTitle: node.title,
    })
  }
  return questions
}

export function climbPathOrder(
  rootId: string,
  nodes: KnowledgeNode[],
  connections: Connection[],
): KnowledgeNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const adj = adjacency(nodes, connections)
  const order: KnowledgeNode[] = []
  const seen = new Set<string>()
  let frontier = [rootId]
  while (frontier.length > 0) {
    const levelNodes = frontier
      .filter((id) => nodeMap.has(id))
      .map((id) => nodeMap.get(id) as KnowledgeNode)
      .sort((a, b) => a.importance - b.importance)
    order.push(...levelNodes)
    for (const id of frontier) seen.add(id)
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!seen.has(nb)) next.push(nb)
      }
    }
    frontier = [...new Set(next)]
  }
  const rest = nodes.filter((n) => !seen.has(n.id))
  return [...order, ...rest]
}

export function answerFromKnowledge(question: string, nodes: KnowledgeNode[], connections: Connection[]): { answer: string; usedNodes: KnowledgeNode[] } {
  const qk = new Set(extractKeywords(question, 24))
  if (qk.size === 0) return { answer: 'Could not extract any searchable terms from the question.', usedNodes: [] }
  const scored = nodes
    .map((n) => {
      const nk = nodeKeywords(n)
      let hits = 0
      for (const k of qk) if (nk.has(k)) hits++
      const titleHit = [...qk].some((k) => n.title.toLowerCase().includes(k))
      return { n, score: hits + (titleHit ? 3 : 0) }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
  if (scored.length === 0) {
    return {
      answer: 'No saved entry matches this question. Your data stays local, so anything below is general model knowledge only if you configure an AI provider in Settings — here there is none. Consider creating an entry first.',
      usedNodes: [],
    }
  }
  const lines = scored.map((x) => `• ${x.n.title} (${x.n.kind}): ${x.n.content ? truncate(x.n.content, 220) : truncate(new Map(nodes.map((n) => [n.id, n])).get(x.n.id)?.content ?? 'no stored content', 180)}`)
  return {
    answer: `Based on your saved knowledge:\n${lines.join('\n')}\n\nThese are extracts from your own database (marked as saved entries). Nothing external was consulted.`,
    usedNodes: scored.map((x) => x.n),
  }
}
