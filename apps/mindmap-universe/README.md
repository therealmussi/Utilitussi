# MINDMAP UNIVERSE

**Everything you know. Everything connected.**

MindMap Universe is a local-first visual knowledge management platform: an interactive knowledge graph, a personal knowledge database, a mind map editor, an AI assistant with a deterministic local fallback, and a Knowledge Discovery engine that surfaces hidden relationships between the things you've saved.

Built with **React 19 + TypeScript + Vite + Tailwind CSS 4 + zustand + IndexedDB (idb)**.

---

## Why the graph is real (not just drawn on screen)

Every node, connection, collection, source and learning path is **persisted in IndexedDB** the moment you create it. The graph visualization is a *view* of that stored data, never the storage itself.

That means:

- close the browser, come back — everything is still there;
- delete a node and its connections, learning path memberships and source links are cleaned up through an explicit cascade;
- merge two "duplicate" concepts and every connection is remapped, nothing is lost;
- export the universe as JSON and the relationships survive the roundtrip (covered by automated tests);
- a future remote backend (e.g. Supabase) can be added behind the same `services/storage.ts` interface.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # unit tests (vitest)
npm run lint         # oxlint
npm run build        # production build
npm run preview      # serve the production build
```

No API key, no account, no server needed. Everything runs locally in the browser.

## What's inside

| Section | What it does |
| --- | --- |
| **Universe** | Interactive knowledge graph: pan, zoom, drag, connect two nodes, filter by type/tag/text, focus mode, 5 layouts (force, radial, hierarchical, circular, timeline). Edges are directional with named relation types and per-connection explanations. The info panel edits everything in place and saves to IndexedDB. |
| **My Knowledge** | CRUD across 12 entry types, collections, favourites, full-text + tag + type search, sorting, related-entry discovery by shared tags. Moving entries between collections never touches their connections. |
| **Mind Maps** | Separate editors with 8 templates (brainstorming, historical analysis, research, planning, book summary, exam prep, business strategy, problem solving), keyboard shortcuts (Tab = child, Enter = sibling, Del = delete, Ctrl+Z/Y = undo/redo), collapse, colors, links and export to PNG / SVG / JSON / PDF(print). |
| **AI Assistant** | Chat grounded in *your* saved entries (it always shows which stored entries support the answer), map generation with a review step, concept expansion, hidden-connection suggestions, duplicate detection with merge, knowledge-gap analysis. |
| **Import Center** | Text, URLs and documents (PDF raw text / TXT / MD / CSV / basic DOCX). Nothing is auto-flooded: every extracted concept is accepted, edited, rejected one by one. |
| **Learning Paths** | Paths computed by BFS over *your actual connections*, ordered root-outward; 4 statuses, progress bars, quizzes generated from your own notes. |
| **Research Library** | Sources with mandatory transparency labels: original source / AI-generated / imported / unverified. Sources link to nodes; nodes show links on the panel. |
| **Insights** | Counts, charts, most connected, isolated entries, duplicates, suggested connections, learning progress — computed exclusively from your saved data. |
| **Settings** | Theme, accent, default layout, text size, AI provider configuration, export/backup/restore, universe management (multiple universes with isolated data). |

## Knowledge Discovery

The differentiating engine (pure, tested functions in `src/knowledge/discovery.ts`):

- **Hidden connections** — scans keyword overlap, shared tags and common graph neighbours, infers a plausible relation type (causal / contradictory / partitive), explains *why*, attaches a confidence score. The user only ever accepts, edits or rejects.
- **Duplicate detection** — normalizes titles, catches aliases and abbreviations ("Artificial intelligence" ≈ "Artificial Intelligence (AI)" ≈ "AI"), suggests merges that *preserve every connection*, never merges silently.
- **Knowledge gaps** — built-in domain profiles (climate science, urban planning, WWII, AI, economics) flag foundational concepts missing from a topic, each with a reason.

No automatic graph mutation: suggestions must be accepted individually.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, data flow, state management
- [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) — IndexedDB schema + future remote schema
- [docs/AI-INTEGRATION.md](docs/AI-INTEGRATION.md) — provider config, local fallback, prompt contracts
- [docs/DATA-FORMAT.md](docs/DATA-FORMAT.md) — the portability JSON format

## Environment variables (optional)

Copy `.env.example` to `.env` and fill only if you want AI features to use a real provider. Keys never leave the browser except toward the endpoint you configure.

## Deployment

The build is a fully static SPA — deploy `dist/` anywhere (Vercel, Netlify, GitHub Pages). No server-side state, no env vars required at runtime.

## Testing

43 automated tests cover the core guarantees: node deletion cascades, connection preservation on merge, layout determinism, export/import roundtrips, discovery suggestions, duplicate detection, quiz and learning-path ordering.

```bash
npm run test
```
