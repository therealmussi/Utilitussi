export type NodeKind =
  | 'concept'
  | 'note'
  | 'question'
  | 'definition'
  | 'person'
  | 'place'
  | 'event'
  | 'book'
  | 'article'
  | 'project'
  | 'research'
  | 'idea'

export type LearningStatus = 'not-started' | 'in-progress' | 'understood' | 'needs-revision'

export interface Universe {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface NodeMetadata {
  date?: string
  periodStart?: string
  periodEnd?: string
  lat?: number
  lng?: number
  origin?: 'user' | 'ai' | 'import'
}

export interface KnowledgeNode {
  id: string
  universeId: string
  title: string
  content: string
  kind: NodeKind
  tags: string[]
  importance: 1 | 2 | 3
  status: LearningStatus
  collectionIds: string[]
  sourceIds: string[]
  favorite: boolean
  metadata: NodeMetadata
  createdAt: string
  updatedAt: string
}

export type RelationType =
  | 'is-part-of'
  | 'causes'
  | 'influences'
  | 'contradicts'
  | 'depends-on'
  | 'is-example-of'
  | 'is-related-to'
  | 'occurred-during'
  | 'is-located-in'
  | 'was-developed-by'
  | (string & {})

export interface Connection {
  id: string
  universeId: string
  sourceId: string
  targetId: string
  type: RelationType
  description: string
  createdAt: string
}

export interface Collection {
  id: string
  universeId: string
  name: string
  description: string
  createdAt: string
}

export type SourceType = 'web' | 'article' | 'book' | 'paper' | 'report' | 'video' | 'document' | 'note'
export type SourceOrigin = 'user' | 'ai' | 'import' | 'unverified'

export interface Source {
  id: string
  universeId: string
  title: string
  type: SourceType
  url: string
  author: string
  publicationDate: string
  notes: string
  tags: string[]
  origin: SourceOrigin
  createdAt: string
}

export interface MindMapNode {
  id: string
  parentId: string | null
  text: string
  note: string
  color: string
  collapsed: boolean
  link?: string
  imageUrl?: string
  x?: number
  y?: number
}

export interface MindMap {
  id: string
  universeId: string
  title: string
  description: string
  nodes: MindMapNode[]
  createdAt: string
  updatedAt: string
}

export interface LearningPathItem {
  nodeId: string
  position: number
  status: LearningStatus
}

export interface LearningPath {
  id: string
  universeId: string
  title: string
  description: string
  itemIds: string[]
  items: Record<string, { status: LearningStatus }>
  createdAt: string
}

export interface AIPreferences {
  baseUrl: string
  apiKey: string
  model: string
}

export interface Preferences {
  theme: 'dark' | 'light'
  accent: string
  defaultLayout: GraphLayoutKind
  textSize: number
  density: 'compact' | 'comfortable'
  ai: AIPreferences
}

export interface Settings {
  id: 'settings'
  preferences: Preferences
}

export type GraphLayoutKind = 'force' | 'radial' | 'circular' | 'hierarchical' | 'timeline'

export interface UniverseExportFile {
  format: 'mindmap-universe'
  version: 1
  exportedAt: string
  universes: Universe[]
  nodes: KnowledgeNode[]
  connections: Connection[]
  collections: Collection[]
  sources: Source[]
  mindMaps: MindMap[]
  learningPaths: LearningPath[]
}

export interface GraphQueryFilter {
  kinds: NodeKind[]
  tags: string[]
  query: string
}
