import type {
  Connection,
  LearningPath,
  MindMap,
  Collection,
  KnowledgeNode,
  NodeKind,
  Source,
  Universe,
} from '@/types'

export const DEFAULT_RELATIONS = [
  'is-related-to',
  'is-part-of',
  'causes',
  'influences',
  'contradicts',
  'depends-on',
  'is-example-of',
  'occurred-during',
  'is-located-in',
  'was-developed-by',
] as const

export const NODE_KINDS: NodeKind[] = [
  'concept', 'note', 'question', 'definition', 'person', 'place', 'event', 'book', 'article', 'project', 'research', 'idea',
]

export const KIND_COLORS: Record<NodeKind, string> = {
  concept: '#4f8cff',
  note: '#8f9bb3',
  question: '#e5b567',
  definition: '#3ecfa0',
  person: '#e98cb0',
  place: '#c3a6ff',
  event: '#f07f6a',
  book: '#63b3ed',
  article: '#7cc7a8',
  project: '#ffcf6e',
  research: '#a78bfa',
  idea: '#ffd166',
}

export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 10)
  const t = Date.now().toString(36)
  return `${prefix}${t}${rnd}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function makeUniverse(name: string, description = ''): Universe {
  return {
    id: uid('u_'),
    name,
    description,
    createdAt: nowISO(),
  }
}

export function makeNode(
  universeId: string,
  title: string,
  extra: Partial<KnowledgeNode> = {},
): KnowledgeNode {
  const ts = nowISO()
  return {
    id: uid('n_'),
    universeId,
    title,
    content: '',
    kind: 'concept',
    tags: [],
    importance: 2,
    status: 'not-started',
    collectionIds: [],
    sourceIds: [],
    favorite: false,
    metadata: { origin: 'user' },
    createdAt: ts,
    updatedAt: ts,
    ...extra,
  }
}

export function makeConnection(
  universeId: string,
  sourceId: string,
  targetId: string,
  type: string = 'is-related-to',
  description = '',
): Connection {
  return {
    id: uid('c_'),
    universeId,
    sourceId,
    targetId,
    type,
    description,
    createdAt: nowISO(),
  }
}

export function makeCollection(universeId: string, name: string, description = ''): Collection {
  return { id: uid('col_'), universeId, name, description, createdAt: nowISO() }
}

export function makeSource(universeId: string, title: string, extra: Partial<Source> = {}): Source {
  return {
    id: uid('s_'),
    universeId,
    title,
    type: 'note',
    url: '',
    author: '',
    publicationDate: '',
    notes: '',
    tags: [],
    origin: 'user',
    createdAt: nowISO(),
    ...extra,
  }
}

export function makeMindMap(universeId: string, title: string, description = ''): MindMap {
  return {
    id: uid('m_'),
    universeId,
    title,
    description,
    nodes: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
}

export function makeLearningPath(universeId: string, title: string, description = ''): LearningPath {
  return {
    id: uid('lp_'),
    universeId,
    title,
    description,
    itemIds: [],
    items: {},
    createdAt: nowISO(),
  }
}

export const SEED_IDEAS: Array<{ title: string; kind: NodeKind; content: string; tags: string[] }> = [
  { title: 'Urban Geography', kind: 'concept', content: 'The study of spatial organization and form of cities.', tags: ['geography', 'cities'] },
  { title: 'Urban morphology', kind: 'concept', content: 'The physical form and structure of urban areas.', tags: ['geography', 'form'] },
  { title: 'Urban planning', kind: 'concept', content: 'The regulation and design of land use and the built environment.', tags: ['planning', 'policy'] },
  { title: 'Population density', kind: 'concept', content: 'Number of inhabitants per unit of area; a driver of transit viability.', tags: ['demography', 'cities'] },
  { title: 'Transportation', kind: 'concept', content: 'The movement of people and goods within and between places.', tags: ['mobility'] },
  { title: 'Land use', kind: 'concept', content: 'How land is allocated: residential, commercial, industrial, green.', tags: ['planning', 'geography'] },
  { title: 'Gentrification', kind: 'concept', content: 'Neighbourhood transformation driven by capital and income influx, displacing original residents.', tags: ['economics', 'inequality'] },
  { title: 'Sustainable mobility', kind: 'concept', content: 'Transport systems minimizing environmental and social costs.', tags: ['mobility', 'sustainability'] },
]
