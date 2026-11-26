import { useMemo } from 'react'
import { create } from 'zustand'
import type {
  Connection,
  LearningPath,
  MindMap,
  Collection,
  KnowledgeNode,
  NodeKind,
  Preferences,
  Source,
  Universe,
  UniverseExportFile,
  LearningStatus,
  RelationType,
} from '@/types'
import * as storage from '../services/storage'
import {
  makeCollection,
  makeConnection,
  makeLearningPath,
  makeMindMap,
  makeNode,
  makeSource,
  makeUniverse,
  nowISO,
} from '../services/factory'
import {
  deleteNodeCascade,
  removeCollectionReference,
  removeSourceReference,
  mergeNodes,
} from '../services/ops'

interface AppState {
  ready: boolean
  initError: string | null
  universes: Universe[]
  nodes: KnowledgeNode[]
  connections: Connection[]
  collections: Collection[]
  sources: Source[]
  mindMaps: MindMap[]
  learningPaths: LearningPath[]
  activeUniverseId: string | null
  preferences: Preferences

  init: () => Promise<void>
  setActiveUniverse: (id: string) => void
  setPreferences: (patch: Partial<Preferences>) => Promise<void>

  createUniverse: (name: string, description?: string) => Promise<Universe>
  deleteUniverse: (id: string) => Promise<void>

  addNode: (title: string, extra?: Partial<KnowledgeNode>) => Promise<KnowledgeNode>
  addNodes: (specs: Array<{ title: string; kind?: NodeKind; content?: string; tags?: string[]; origin?: 'user' | 'ai' | 'import' }>) => Promise<KnowledgeNode[]>
  updateNode: (id: string, patch: Partial<KnowledgeNode>) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  mergeDuplicate: (keepId: string, absorbId: string) => Promise<void>

  addConnection: (sourceId: string, targetId: string, type: RelationType, description?: string) => Promise<Connection | null>
  updateConnection: (id: string, patch: Partial<Pick<Connection, 'type' | 'description'>>) => Promise<void>
  deleteConnection: (id: string) => Promise<void>

  addCollection: (name: string, description?: string) => Promise<Collection>
  deleteCollection: (id: string) => Promise<void>

  addSource: (title: string, extra?: Partial<Source>) => Promise<Source>
  updateSource: (id: string, patch: Partial<Source>) => Promise<void>
  deleteSource: (id: string) => Promise<void>

  createMindMap: (title: string, description?: string) => Promise<MindMap>
  saveMindMap: (map: MindMap) => Promise<void>
  deleteMindMap: (id: string) => Promise<void>

  createLearningPath: (title: string, description?: string) => Promise<LearningPath>
  saveLearningPath: (path: LearningPath) => Promise<void>
  setLearningStatus: (pathId: string, nodeId: string, status: LearningStatus) => Promise<void>
  deleteLearningPath: (id: string) => Promise<void>

  exportFile: (universeId?: string | null) => UniverseExportFile
  importFile: (data: UniverseExportFile) => Promise<void>
}

const ACTIVE_KEY = 'mmu.activeUniverse'

function pick<T extends { id: string; universeId?: string }>(items: T[], universeId: string | null): T[] {
  return universeId ? items.filter((i) => i.universeId === universeId) : items
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  initError: null,
  universes: [],
  nodes: [],
  connections: [],
  collections: [],
  sources: [],
  mindMaps: [],
  learningPaths: [],
  activeUniverseId: null,
  preferences: storage.DEFAULT_PREFERENCES,

  init: async () => {
    try {
      await storage.bootstrapIfEmpty()
      const all = await storage.loadAll()
      const settings = await storage.loadSettings()
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null
      const active = all.universes.some((u) => u.id === saved) ? saved : (all.universes[0]?.id ?? null)
      set({
        ready: true,
        initError: null,
        universes: all.universes,
        nodes: all.nodes,
        connections: all.connections,
        collections: all.collections,
        sources: all.sources,
        mindMaps: all.mindMaps,
        learningPaths: all.learningPaths,
        preferences: settings.preferences,
        activeUniverseId: active,
      })
    } catch (err) {
      set({
        ready: true,
        initError: err instanceof Error ? err.message : String(err),
        universes: [],
        nodes: [],
        connections: [],
        collections: [],
        sources: [],
        mindMaps: [],
        learningPaths: [],
        activeUniverseId: null,
      })
    }
  },

  setActiveUniverse: (id) => {
    localStorage.setItem(ACTIVE_KEY, id)
    set({ activeUniverseId: id })
  },

  setPreferences: async (patch) => {
    const preferences = { ...get().preferences, ...patch, ai: { ...get().preferences.ai, ...(patch.ai ?? {}) } }
    set({ preferences })
    await storage.saveSettings(preferences)
  },

  createUniverse: async (name, description = '') => {
    const u = makeUniverse(name, description)
    await storage.putUniverse(u)
    localStorage.setItem(ACTIVE_KEY, u.id)
    set((s) => ({ universes: [...s.universes, u], activeUniverseId: u.id }))
    return u
  },

  deleteUniverse: async (id) => {
    await storage.deleteUniverse(id)
    set((s) => {
      const universes = s.universes.filter((u) => u.id !== id)
      const active = s.activeUniverseId === id ? (universes[0]?.id ?? null) : s.activeUniverseId
      return { universes, activeUniverseId: active, nodes: pick(s.nodes, active), connections: pick(s.connections, active), collections: pick(s.collections, active), sources: pick(s.sources, active), mindMaps: pick(s.mindMaps, active), learningPaths: pick(s.learningPaths, active) }
    })
  },

  addNode: async (title, extra = {}) => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const node = makeNode(universeId, title, extra)
    await storage.putNode(node)
    set((s) => ({ nodes: [...s.nodes, node] }))
    return node
  },

  addNodes: async (specs) => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const created = specs.map((sp) =>
      makeNode(universeId, sp.title, {
        kind: sp.kind ?? 'concept',
        content: sp.content ?? '',
        tags: sp.tags ?? [],
        metadata: { origin: sp.origin ?? 'ai' },
      }),
    )
    for (const n of created) await storage.putNode(n)
    set((s) => ({ nodes: [...s.nodes, ...created] }))
    return created
  },

  updateNode: async (id, patch) => {
    const nodes = get().nodes
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    const updated: KnowledgeNode = { ...node, ...patch, id, updatedAt: nowISO() }
    await storage.putNode(updated)
    set({ nodes: nodes.map((n) => (n.id === id ? updated : n)) })
  },

  deleteNode: async (id) => {
    await storage.deleteNode(id)
    const before = get()
    const next = deleteNodeCascade(before, id)
    for (const p of next.learningPaths) {
      if (before.learningPaths.find((x) => x.id === p.id) !== p) await storage.putLearningPath(p)
    }
    set({ nodes: next.nodes, connections: next.connections, learningPaths: next.learningPaths })
  },

  mergeDuplicate: async (keepId, absorbId) => {
    const s = get()
    const next = mergeNodes(s, keepId, absorbId)
    const kept = next.nodes.find((n) => n.id === keepId)
    if (kept) await storage.putNode(kept)
    await storage.deleteNode(absorbId)
    for (const c of next.connections) await storage.putConnection(c)
    for (const p of next.learningPaths) await storage.putLearningPath(p)
    set({ nodes: next.nodes, connections: next.connections, learningPaths: next.learningPaths })
  },

  addConnection: async (sourceId, targetId, type, description = '') => {
    if (sourceId === targetId) return null
    const s = get()
    const exists = s.connections.some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId && c.type === type) ||
        (c.sourceId === targetId && c.targetId === sourceId && c.type === type),
    )
    if (exists) return null
    const universeId = s.activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const conn = makeConnection(universeId, sourceId, targetId, type, description)
    await storage.putConnection(conn)
    set((st) => ({ connections: [...st.connections, conn] }))
    return conn
  },

  updateConnection: async (id, patch) => {
    const connections = get().connections
    const conn = connections.find((c) => c.id === id)
    if (!conn) return
    const next = { ...conn, ...patch, id }
    await storage.putConnection(next)
    set({ connections: connections.map((c) => (c.id === id ? next : c)) })
  },

  deleteConnection: async (id) => {
    await storage.deleteConnection(id)
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) }))
  },

  addCollection: async (name, description = '') => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const c = makeCollection(universeId, name, description)
    await storage.putCollection(c)
    set((s) => ({ collections: [...s.collections, c] }))
    return c
  },

  deleteCollection: async (id) => {
    await storage.deleteCollection(id)
    const nodes = removeCollectionReference(get().nodes, id)
    for (const n of nodes) await storage.putNode(n)
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id), nodes }))
  },

  addSource: async (title, extra = {}) => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const src = makeSource(universeId, title, extra)
    await storage.putSource(src)
    set((s) => ({ sources: [...s.sources, src] }))
    return src
  },

  updateSource: async (id, patch) => {
    const sources = get().sources
    const src = sources.find((x) => x.id === id)
    if (!src) return
    const next = { ...src, ...patch, id }
    await storage.putSource(next)
    set({ sources: sources.map((x) => (x.id === id ? next : x)) })
  },

  deleteSource: async (id) => {
    await storage.deleteSource(id)
    const nodes = removeSourceReference(get().nodes, id)
    for (const n of nodes) await storage.putNode(n)
    set((s) => ({ sources: s.sources.filter((x) => x.id !== id), nodes }))
  },

  createMindMap: async (title, description = '') => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const m = makeMindMap(universeId, title, description)
    await storage.putMindMap(m)
    set((s) => ({ mindMaps: [...s.mindMaps, m] }))
    return m
  },

  saveMindMap: async (map) => {
    const next = { ...map, updatedAt: nowISO() }
    await storage.putMindMap(next)
    set((s) => ({ mindMaps: s.mindMaps.some((m) => m.id === next.id) ? s.mindMaps.map((m) => (m.id === next.id ? next : m)) : [...s.mindMaps, next] }))
  },

  deleteMindMap: async (id) => {
    await storage.deleteMindMap(id)
    set((s) => ({ mindMaps: s.mindMaps.filter((m) => m.id !== id) }))
  },

  createLearningPath: async (title, description = '') => {
    const universeId = get().activeUniverseId
    if (!universeId) throw new Error('No active universe')
    const p = makeLearningPath(universeId, title, description)
    await storage.putLearningPath(p)
    set((s) => ({ learningPaths: [...s.learningPaths, p] }))
    return p
  },

  saveLearningPath: async (path) => {
    await storage.putLearningPath(path)
    set((s) => ({ learningPaths: s.learningPaths.some((p) => p.id === path.id) ? s.learningPaths.map((p) => (p.id === path.id ? path : p)) : [...s.learningPaths, path] }))
  },

  setLearningStatus: async (pathId, nodeId, status) => {
    const paths = get().learningPaths
    const p = paths.find((x) => x.id === pathId)
    if (!p) return
    const items = { ...p.items, [nodeId]: { status } }
    const next = { ...p, items }
    await storage.putLearningPath(next)
    set({ learningPaths: paths.map((x) => (x.id === pathId ? next : x)) })
  },

  deleteLearningPath: async (id) => {
    await storage.deleteLearningPath(id)
    set((s) => ({ learningPaths: s.learningPaths.filter((p) => p.id !== id) }))
  },

  exportFile: (universeId) => {
    const s = get()
    const scope = universeId ?? s.activeUniverseId
    const single = scope !== null
    const allow = (x: { universeId: string }) => (single ? x.universeId === scope : true)
    return {
      format: 'mindmap-universe',
      version: 1,
      exportedAt: nowISO(),
      universes: s.universes.filter((u) => !single || u.id === scope),
      nodes: s.nodes.filter(allow),
      connections: s.connections.filter(allow),
      collections: s.collections.filter(allow),
      sources: s.sources.filter(allow),
      mindMaps: s.mindMaps.filter(allow),
      learningPaths: s.learningPaths.filter(allow),
    }
  },

  importFile: async (data) => {
    await storage.bulkPut(data)
    const all = await storage.loadAll()
    set({
      universes: all.universes,
      nodes: all.nodes,
      connections: all.connections,
      collections: all.collections,
      sources: all.sources,
      mindMaps: all.mindMaps,
      learningPaths: all.learningPaths,
    })
  },
}))

export function useActiveUniverse(): Universe | undefined {
  return useAppStore((s) => s.universes.find((u) => u.id === s.activeUniverseId))
}

export function useUniverseData() {
  const nodes = useAppStore((s) => s.nodes)
  const connections = useAppStore((s) => s.connections)
  const collections = useAppStore((s) => s.collections)
  const sources = useAppStore((s) => s.sources)
  const activeUniverseId = useAppStore((s) => s.activeUniverseId)
  return useMemo(
    () => ({
      nodes: activeUniverseId ? nodes.filter((n) => n.universeId === activeUniverseId) : nodes,
      connections: activeUniverseId ? connections.filter((c) => c.universeId === activeUniverseId) : connections,
      collections: activeUniverseId ? collections.filter((c) => c.universeId === activeUniverseId) : collections,
      sources: activeUniverseId ? sources.filter((x) => x.universeId === activeUniverseId) : sources,
    }),
    [nodes, connections, collections, sources, activeUniverseId],
  )
}

export type { AppState }
