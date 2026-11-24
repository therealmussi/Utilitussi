import { describe, expect, it } from 'vitest'
import { sanitizeImport, toExport } from './storage'
import { makeConnection, makeLearningPath, makeMindMap, makeNode, makeSource, makeUniverse } from './factory'

function buildExportPayload(): ReturnType<typeof buildPayload> {
  return buildPayload()
}

function buildPayload() {
  const u = makeUniverse('Home', 'test')
  const a = makeNode(u.id, 'Alpha')
  const b = makeNode(u.id, 'Beta')
  const c = makeConnection(u.id, a.id, b.id, 'causes', 'because')
  const col = { id: 'col1', universeId: u.id, name: 'Test collection', description: '', createdAt: a.createdAt }
  a.collectionIds.push(col.id)
  const src = makeSource(u.id, 'Some paper', { type: 'paper', author: 'Nobody' })
  a.sourceIds.push(src.id)
  const map = makeMindMap(u.id, 'A map')
  map.nodes.push({ id: 'mm1', parentId: null, text: 'Root', note: '', color: '#000', collapsed: false, x: 12, y: 30 })
  const lp = makeLearningPath(u.id, 'A path')
  lp.itemIds = [a.id, b.id]
  lp.items = { [a.id]: { status: 'understood' } }
  return {
    format: 'mindmap-universe' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    universes: [u],
    nodes: [a, b],
    connections: [c],
    collections: [col],
    sources: [src],
    mindMaps: [map],
    learningPaths: [lp],
  }
}

describe('sanitization + roundtrip', () => {
  it('keeps node ids, relationships, tags, sources and metadata through JSON.stringify/parse', () => {
    const payload = buildExportPayload()
    const json = toExport(payload)
    const parsed = JSON.parse(json)
    const clean = sanitizeImport(parsed)
    expect(clean).not.toBeNull()
    if (!clean) return
    expect(clean.nodes).toHaveLength(2)
    expect(clean.connections[0].sourceId).toBe(clean.nodes[0].id)
    expect(clean.connections[0].targetId).toBe(clean.nodes[1].id)
    expect(clean.connections[0].type).toBe('causes')
    expect(clean.nodes[0].collectionIds).toContain('col1')
    expect(clean.nodes[0].sourceIds).toContain(clean.sources[0].id)
    expect(clean.learningPaths[0].itemIds).toEqual([clean.nodes[0].id, clean.nodes[1].id])
  })

  it('preserves mind map positions', () => {
    const payload = buildExportPayload()
    const clean = sanitizeImport(JSON.parse(toExport(payload)))
    expect(clean!.mindMaps[0].nodes[0].x).toBe(12)
    expect(clean!.mindMaps[0].nodes[0].y).toBe(30)
  })

  it('rejects foreign or corrupt files', () => {
    expect(sanitizeImport(null)).toBeNull()
    expect(sanitizeImport({ format: 'other-app' })).toBeNull()
    expect(sanitizeImport('hello')).toBeNull()
    expect(sanitizeImport({ format: 'mindmap-universe', nodes: 'oops' })).not.toBeNull()
  })
})
