import { getDB } from './db'
import type {
  Connection,
  LearningPath,
  MindMap,
  Collection,
  KnowledgeNode,
  Settings,
  Source,
  Universe,
  UniverseExportFile,
  Preferences,
} from '@/types'
import { makeUniverse } from './factory'

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  accent: '#4f8cff',
  defaultLayout: 'force',
  textSize: 14,
  density: 'comfortable',
  ai: { baseUrl: '', apiKey: '', model: '' },
}

export async function loadAll(): Promise<UniverseExportFile> {
  const db = await getDB()
  const [universes, nodes, connections, collections, sources, mindMaps, learningPaths] = await Promise.all([
    db.getAll('universes'),
    db.getAll('nodes'),
    db.getAll('connections'),
    db.getAll('collections'),
    db.getAll('sources'),
    db.getAll('mindmaps'),
    db.getAll('learningpaths'),
  ])
  return { format: 'mindmap-universe', version: 1, exportedAt: new Date().toISOString(), universes, nodes, connections, collections, sources, mindMaps, learningPaths }
}

export async function loadSettings(): Promise<Settings> {
  const db = await getDB()
  return (await db.get('settings', 'settings')) ?? { id: 'settings', preferences: DEFAULT_PREFERENCES }
}

export async function saveSettings(prefs: Preferences): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: 'settings', preferences: prefs })
}

export async function putUniverse(u: Universe) { return (await getDB()).put('universes', u) }
export async function putNode(n: KnowledgeNode) { return (await getDB()).put('nodes', n) }
export async function putConnection(c: Connection) { return (await getDB()).put('connections', c) }
export async function putCollection(c: Collection) { return (await getDB()).put('collections', c) }
export async function putSource(s: Source) { return (await getDB()).put('sources', s) }
export async function putMindMap(m: MindMap) { return (await getDB()).put('mindmaps', m) }
export async function putLearningPath(p: LearningPath) { return (await getDB()).put('learningpaths', p) }

export async function deleteNode(id: string): Promise<string[]> {
  const db = await getDB()
  await db.delete('nodes', id)
  const deadLinks: string[] = []
  let cursor = await db.transaction('connections').store.openCursor()
  while (cursor) {
    const c = cursor.value
    if (c.sourceId === id || c.targetId === id) {
      await db.delete('connections', c.id)
      deadLinks.push(c.id)
    }
    cursor = await cursor.continue()
  }
  return deadLinks
}

export async function deleteConnection(id: string) { return (await getDB()).delete('connections', id) }
export async function deleteCollection(id: string) { return (await getDB()).delete('collections', id) }
export async function deleteSource(id: string) { return (await getDB()).delete('sources', id) }
export async function deleteMindMap(id: string) { return (await getDB()).delete('mindmaps', id) }
export async function deleteLearningPath(id: string) { return (await getDB()).delete('learningpaths', id) }

export async function deleteUniverse(universeId: string): Promise<void> {
  const db = await getDB()
  for (const store of ['nodes', 'connections', 'collections', 'sources', 'mindmaps', 'learningpaths'] as const) {
    const idx = db.transaction(store).store.index('by-universe')
    let cursor = await idx.openCursor(IDBKeyRange.only(universeId))
    while (cursor) {
      await db.delete(store, cursor.value.id)
      cursor = await cursor.continue()
    }
  }
  await db.delete('universes', universeId)
}

export async function bulkPut(data: UniverseExportFile): Promise<void> {
  const db = await getDB()
  for (const u of data.universes) await db.put('universes', u)
  for (const n of data.nodes) await db.put('nodes', n)
  for (const c of data.connections) await db.put('connections', c)
  for (const c of data.collections) await db.put('collections', c)
  for (const s of data.sources) await db.put('sources', s)
  for (const m of data.mindMaps) await db.put('mindmaps', m)
  for (const p of data.learningPaths) await db.put('learningpaths', p)
}

export async function emptyDatabase(): Promise<void> {
  const db = await getDB()
  for (const store of ['universes', 'nodes', 'connections', 'collections', 'sources', 'mindmaps', 'learningpaths'] as const) {
    await db.clear(store)
  }
}

export async function restoreFull(data: UniverseExportFile): Promise<void> {
  await emptyDatabase()
  await bulkPut(data)
}

export async function bootstrapIfEmpty(): Promise<void> {
  const db = await getDB()
  if ((await db.count('universes')) === 0) {
    const home = makeUniverse('Home', 'Your default knowledge universe.')
    await db.put('universes', home)
  }
}

export function toExport(data: UniverseExportFile): string {
  return JSON.stringify(data, null, 2)
}

export function sanitizeImport(raw: unknown): UniverseExportFile | null {
  const d = raw as Partial<UniverseExportFile>
  if (!d || typeof d !== 'object') return null
  const dAny = d as Record<string, unknown>
  if (dAny.format !== 'mindmap-universe') return null
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
  return {
    format: 'mindmap-universe',
    version: 1,
    exportedAt: new Date().toISOString(),
    universes: arr(d.universes) as Universe[],
    nodes: arr(d.nodes) as KnowledgeNode[],
    connections: arr(d.connections) as Connection[],
    collections: arr(d.collections) as Collection[],
    sources: arr(d.sources) as Source[],
    mindMaps: arr(d.mindMaps) as MindMap[],
    learningPaths: arr(d.learningPaths) as LearningPath[],
  }
}
