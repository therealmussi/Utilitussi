# Database schema

## Current storage: IndexedDB (local-first)

Database `mindmap-universe`, version 1, via `idb`.

| Object store | Key | Value | Indexes |
| --- | --- | --- | --- |
| `universes` | `id` | `Universe {id, name, description, createdAt}` | — |
| `nodes` | `id` | `KnowledgeNode` | `by-universe` → `universeId` |
| `connections` | `id` | `Connection` | `by-universe` |
| `collections` | `id` | `Collection` | `by-universe` |
| `sources` | `id` | `Source` | `by-universe` |
| `mindmaps` | `id` | `MindMap` | `by-universe` |
| `learningpaths` | `id` | `LearningPath` | `by-universe` |
| `settings` | `"settings"` | `{preferences}` | — |

### Entity definitions

**KnowledgeNode**
`id`, `universeId`, `title`, `content`, `kind` (concept|note|question|definition|person|place|event|book|article|project|research|idea), `tags[]`, `importance` (1–3), `status` (learning), `collectionIds[]`, `sourceIds[]`, `favorite`, `metadata {date?, lat?, lng?, origin: user|ai|import}`, `createdAt`, `updatedAt`.

**Connection**
`id`, `universeId`, `sourceId`, `targetId`, `type` (relation vocabulary: is-part-of, causes, influences, contradicts, depends-on, is-example-of, is-related-to, occurred-during, is-located-in, was-developed-by — custom strings allowed), `description`, `createdAt`.
Direction is meaningful; the UI renders an arrow `source → target`.

**Source** — `id`, `universeId`, `title`, `type` (web|article|book|paper|report|video|document|note), `url`, `author`, `publicationDate`, `notes`, `tags[]`, `origin` (user|ai|import|unverified), `createdAt`.
`origin` is the transparency label shown in the library; `author` and `publicationDate` are left empty unless the user actually knows them.

**MindMap** — `id`, `universeId`, `title`, `description`, `nodes[]` (`id`, `parentId`, `text`, `note`, `color`, `collapsed`, `link?`, `x?`, `y?`), timestamps. Mind maps are independent of the global graph.

**LearningPath** — `id`, `universeId`, `title`, `description`, `itemIds[]` (ordered), `items {nodeId: {status}}`, `createdAt`.

### Referential integrity

Enforced in code (`services/ops.ts` + store actions):

- deleting a node cascades to connections and learning-path memberships;
- deleting a collection strips `collectionIds` references;
- deleting a source strips `sourceIds` references;
- connections referencing missing nodes are prunable (`pruneOrphanConnections`).

## Future: remote (Supabase suggestion)

One table per object store, UUID primary keys, `universe_id` foreign keys with `ON DELETE CASCADE`, RLS policies on `user_id`. Suggested SQL sketch:

```sql
create table nodes (
  id uuid primary key,
  universe_id uuid references universes(id) on delete cascade,
  title text not null,
  content text,
  kind text not null,
  tags text[],
  importance smallint default 2,
  status text default 'not-started',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table connections (
  id uuid primary key,
  universe_id uuid references universes(id) on delete cascade,
  source_node_id uuid references nodes(id) on delete cascade,
  target_node_id uuid references nodes(id) on delete cascade,
  type text not null,
  description text,
  created_at timestamptz default now()
);

create index on nodes (universe_id);
create index on connections (universe_id);
create index on connections (source_node_id, target_node_id);
```

Junction tables for node↔collection and node↔source replace the current id arrays if you prefer full relational integrity; the JSON export format is unchanged either way.
