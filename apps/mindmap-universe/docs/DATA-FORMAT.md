# Data format (`.json` exports)

All exports share one envelope:

```json
{
  "format": "mindmap-universe",
  "version": 1,
  "exportedAt": "2025-01-01T12:00:00.000Z",
  "universes":  [],
  "nodes":      [],
  "connections":[],
  "collections":[],
  "sources":    [],
  "mindMaps":   [],
  "learningPaths": []
}
```

- `universes`: a full backup contains every universe; a single-universe export contains only the current one.
- All other arrays are already **scoped** to the exported universe(s) in single-universe exports; in a full backup they mix universes (each row carries `universeId`).

## Node

```json
{
  "id": "n_lx…",
  "universeId": "u_lx…",
  "title": "Urban density",
  "content": "…",
  "kind": "concept",
  "tags": ["demography", "cities"],
  "importance": 2,
  "status": "not-started",
  "collectionIds": ["col_lx…"],
  "sourceIds": ["s_lx…"],
  "favorite": false,
  "metadata": { "origin": "user", "date": "1975-01-01", "lat": 45.46, "lng": 9.19 },
  "createdAt": "…",
  "updatedAt": "…"
}
```

## Connection

```json
{
  "id": "c_lx…", "universeId": "u_lx…",
  "sourceId": "n_lx…", "targetId": "n_lx…",
  "type": "influences",
  "description": "Density concentrates potential transit users.",
  "createdAt": "…"
}
```

Direction is significant: `type` reads as `source → target`.

## MindMap

```json
{
  "id": "m_lx…", "universeId": "u_lx…", "title": "…", "description": "…",
  "nodes": [
    { "id": "mm_1", "parentId": null, "text": "Root", "note": "", "color": "#4f8cff",
      "collapsed": false, "x": 12, "y": 30 }
  ],
  "createdAt": "…", "updatedAt": "…"
}
```

`x`/`y` are optional manual overrides — preserved on export so a re-imported map looks the same.

## LearningPath

`itemIds` is the ordered list; `items` maps `nodeId → {status}`. Statuses: `not-started`, `in-progress`, `understood`, `needs-revision`.

## Import rules

- The importer (`sanitizeImport`) accepts **only** `format === "mindmap-universe"`; anything else is rejected with a clear error, never partially applied.
- Import is **additive** (`bulkPut`): existing rows with the same id are replaced, others untouched. A full restore (Settings → Restore full backup) wipes the database first and is explicit.
- Ids are preserved on import, so relationships, source links and mind map positions survive export → import cycles. Verified by `src/services/exportImport.test.ts`.

## Not a proprietary format

The envelope is plain JSON: your knowledge is readable with any script or editor. If the app disappeared tomorrow, a text editor is enough to reopen your universe.
