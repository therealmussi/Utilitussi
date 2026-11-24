import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Connection,
  LearningPath,
  MindMap,
  Collection,
  KnowledgeNode,
  Settings,
  Source,
  Universe,
} from '@/types'

export const DB_NAME = 'mindmap-universe'
export const DB_VERSION = 1

export interface UniverseDB extends DBSchema {
  universes: { key: string; value: Universe; indexes: {} }
  nodes: { key: string; value: KnowledgeNode; indexes: { 'by-universe': string } }
  connections: { key: string; value: Connection; indexes: { 'by-universe': string } }
  collections: { key: string; value: Collection; indexes: { 'by-universe': string } }
  sources: { key: string; value: Source; indexes: { 'by-universe': string } }
  mindmaps: { key: string; value: MindMap; indexes: { 'by-universe': string } }
  learningpaths: { key: string; value: LearningPath; indexes: { 'by-universe': string } }
  settings: { key: string; value: Settings }
}

let dbPromise: Promise<IDBPDatabase<UniverseDB>> | null = null

export function getDB(): Promise<IDBPDatabase<UniverseDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UniverseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('universes')) db.createObjectStore('universes', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('nodes')) {
          const s = db.createObjectStore('nodes', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('connections')) {
          const s = db.createObjectStore('connections', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('collections')) {
          const s = db.createObjectStore('collections', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('sources')) {
          const s = db.createObjectStore('sources', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('mindmaps')) {
          const s = db.createObjectStore('mindmaps', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('learningpaths')) {
          const s = db.createObjectStore('learningpaths', { keyPath: 'id' })
          s.createIndex('by-universe', 'universeId')
        }
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false
    const db = await getDB()
    return !!db
  } catch {
    return false
  }
}
