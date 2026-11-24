# Architecture

## Layered structure

```
src/
  types/            Domain types (KnowledgeNode, Connection, Universe, ...)
  services/
    db.ts           IndexedDB bootstrap (idb), schema v1
    storage.ts      Repository: loadAll, putX, deleteX, cascade deletes, bulkPut, restore
    ops.ts          PURE graph operations (cascades, merges, reference cleanup) — unit tested
    factory.ts      Entity factories + default relation/entity vocabularies
  store/
    useAppStore.ts  zustand store: in-memory cache + persistence calls
  graph/
    layouts.ts      Pure layout functions: force, radial, hierarchical, circular, timeline
  knowledge/
    similarity.ts   Tokenization-normalized similarity, duplicate scoring, search
    discovery.ts    Connection suggestions, gap detection, isolated nodes, domain seeds
  ai/
    provider.ts     OpenAI-compatible fetch (config from env or Settings)
    localEngine.ts  Deterministic fallback for every AI skill
    index.ts        Skill orchestration: try provider, validate JSON, fall back locally
  features/         One folder per app section (universe, knowledge, mindmaps, ...)
  components/       Shared UI (Button, Modal, Badge, Layout with sidebar + palette)
  utils/            Keyword extraction, truncation, debounce
  test/             vitest setup
```

## Data flow

```
UI action
  → zustand action (useAppStore)
      → services/ops.ts pure transforms (validation, cascades)
      → services/storage.ts → IndexedDB (write-through)
      → state update → subscribed components re-render
```

The graph page never owns mutable geometry as source of truth: layouts are pure functions of `(nodes, connections, layoutKind)`, recomputed on switch. User drags create a session-only position cache that never alters stored data.

## Key invariants (enforced by tests)

1. `deleteNodeCascade` removes the node **and** every connection referencing it, plus learning-path memberships.
2. `mergeNodes` remaps absorbed connections and collapses self-loops/duplicates; tags and content merge.
3. `sanitizeImport` accepts only `format: "mindmap-universe"` payloads; roundtrip `export → JSON.parse → import` preserves ids, relations, tags, source links, mind map positions.
4. Layout functions return a position for every node id and never mutate input.
5. Suggestion engines never mutate the graph — return values are applied by the user.

## Performance approach

- Layouts run synchronously on request (force: bounded iterations) — not per-frame.
- Filtering before rendering: hidden nodes are not painted at all.
- Search uses substring matching on the in-memory snapshot; IndexedDB keeps the full dataset resident while under tens of thousands of nodes.
- Future path for large graphs: split by collection, web worker for force iterations, virtualized edge rendering. Hooks for this already exist in `computeLayout`.

## Future remote backend

`services/storage.ts` is the only module that touches persistence. A Supabase (or any REST) implementation of the same functions (put/delete/load) is sufficient to move from local-first to synced, without touching UI or graph code.
