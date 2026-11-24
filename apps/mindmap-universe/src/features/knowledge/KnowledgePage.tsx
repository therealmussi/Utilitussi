import { useMemo, useState } from 'react'
import { Search, Plus, FolderPlus, Folder as FolderIcon, Star, FolderOpen, Trash2, BookMarked } from 'lucide-react'
import type { Collection, KnowledgeNode } from '@/types'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { KIND_COLORS, NODE_KINDS } from '@/services/factory'
import { searchNodes } from '@/knowledge/similarity'
import { Button, Input, Modal, Select, Textarea, Tag, EmptyState, SectionTitle } from '@/components/ui'
import { truncate } from '@/utils/text'

export function KnowledgePage() {
  const { nodes, collections } = useUniverseData()
  const addNode = useAppStore((s) => s.addNode)
  const updateNode = useAppStore((s) => s.updateNode)
  const deleteNode = useAppStore((s) => s.deleteNode)
  const addCollection = useAppStore((s) => s.addCollection)
  const deleteCollection = useAppStore((s) => s.deleteCollection)

  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [tag, setTag] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [sort, setSort] = useState<'recent' | 'title' | 'connections'>('recent')
  const [editNode, setEditNode] = useState<KnowledgeNode | null>(null)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)

  const allTags = useMemo(() => [...new Set(nodes.flatMap((n) => n.tags))].sort(), [nodes])

  const filtered = useMemo(() => {
    let list = searchNodes(nodes, { kinds: (kind ? [kind as KnowledgeNode['kind']] : []), tags: tag ? [tag] : [], query })
    if (onlyFavorites) list = list.filter((n) => n.favorite)
    if (collectionId) list = list.filter((n) => n.collectionIds.includes(collectionId))
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'recent') list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return list
  }, [nodes, query, kind, tag, collectionId, onlyFavorites, sort])

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-60 shrink-0 space-y-4 overflow-y-auto border-r border-hair bg-panel p-3">
        <div>
          <SectionTitle right={<button className="text-ink-3 hover:text-ink" onClick={() => setNewCollectionOpen(true)}><Plus size={13} /></button>}>Collections</SectionTitle>
          <button
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${collectionId === '' ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-panel-2'}`}
            onClick={() => setCollectionId('')}
          >
            <BookMarked size={13} /> All entries
          </button>
          <button
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${onlyFavorites ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-panel-2'}`}
            onClick={() => setOnlyFavorites((f) => !f)}
          >
            <Star size={13} /> Favourites
          </button>
          {collections.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-md px-2 py-1.5 text-xs ${collectionId === c.id ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-panel-2'}`}>
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setCollectionId(c.id)}>
                <FolderIcon size={13} className="shrink-0" />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-[10px] text-ink-3">{nodes.filter((n) => n.collectionIds.includes(c.id)).length}</span>
              </button>
              <button className="ml-1 hidden text-ink-3 hover:text-bad group-hover:block" onClick={() => void deleteCollection(c.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <div>
          <SectionTitle>Tags</SectionTitle>
          <div className="flex flex-wrap gap-1">
            <button className={`rounded-full px-2 py-0.5 text-[10px] ${tag === '' ? 'bg-accent text-white' : 'bg-panel-3 text-ink-2'}`} onClick={() => setTag('')}>all</button>
            {allTags.map((t) => (
              <button key={t} className={`rounded-full px-2 py-0.5 text-[10px] ${tag === t ? 'bg-accent text-white' : 'bg-panel-3 text-ink-2'}`} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search size={14} className="absolute top-2.5 left-2.5 text-ink-3" />
            <Input placeholder="Search title, content, tags…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!w-36">
            <option value="">All types</option>
            {NODE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'title')} className="!w-36">
            <option value="recent">Recently edited</option>
            <option value="title">Title A→Z</option>
          </Select>
          <Button variant="primary" onClick={() => setEditNode(makeDraft())}>
            <Plus size={14} /> New entry
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={36} />}
            title="No entries found"
            hint="Create your first entry or relax the filters. Entries saved here are the material of your knowledge graph."
            action={<Button variant="primary" onClick={() => setEditNode(makeDraft())}><Plus size={14} /> New entry</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((n) => (
              <button
                key={n.id}
                className="rounded-lg border border-hair bg-panel p-3 text-left transition-colors hover:border-accent"
                onClick={() => setEditNode(n)}
              >
                <div className="flex items-center gap-2">
                  <Tag label={n.kind} color={KIND_COLORS[n.kind]} />
                  {n.favorite && <Star size={11} className="text-warn" fill="currentColor" />}
                  <span className="ml-auto text-[10px] text-ink-3">{new Date(n.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-1.5 truncate text-sm font-medium text-ink">{n.title}</div>
                <div className="mt-0.5 line-clamp-2 min-h-8 text-xs text-ink-2">{truncate(n.content || 'No content yet.', 120)}</div>
                {n.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.tags.slice(0, 4).map((t) => <Tag key={t} label={`#${t}`} />)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <EntryModal
        draft={editNode}
        collections={collections}
        onClose={() => setEditNode(null)}
        onSave={async (node, data) => {
          if (node.id) {
            await updateNode(node.id, { ...data })
          } else {
            await addNode(data.title ?? 'Untitled', data)
          }
          setEditNode(null)
        }}
        onDelete={async (id) => {
          await deleteNode(id)
          setEditNode(null)
        }}
      />

      <Modal open={newCollectionOpen} onClose={() => setNewCollectionOpen(false)} title="New collection">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const input = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value
            if (input.trim()) await addCollection(input.trim())
            setNewCollectionOpen(false)
          }}
        >
          <Input name="name" placeholder="e.g. University notes" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNewCollectionOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}

function makeDraft(): KnowledgeNode {
  const now = new Date().toISOString()
  return {
    id: '',
    universeId: '',
    title: '',
    content: '',
    kind: 'concept',
    tags: [],
    importance: 2,
    status: 'not-started',
    collectionIds: [],
    sourceIds: [],
    favorite: false,
    metadata: { origin: 'user' },
    createdAt: now,
    updatedAt: now,
  }
}

function EntryModal({
  draft, collections, onClose, onSave, onDelete,
}: {
  draft: KnowledgeNode | null
  collections: Collection[]
  onClose: () => void
  onSave: (node: KnowledgeNode, data: Partial<KnowledgeNode>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const nodes = useAppStore((s) => s.nodes)
  const [form, setForm] = useState(draft)
  if (draft?.id !== form?.id) {
    setForm(draft)
  }
  if (!form) return null
  const related = form.id ? nodes.filter((n) => n.id !== form.id && (form.tags.some((t) => n.tags.includes(t)))) .slice(0, 8) : []
  const set = (patch: Partial<KnowledgeNode>) => setForm((f) => (f ? { ...f, ...patch } : f))
  return (
    <Modal open onClose={onClose} title={form.id ? 'Edit entry' : 'New entry'} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void onSave(form, form)
        }}
      >
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title" required />
        <Textarea rows={6} value={form.content} onChange={(e) => set({ content: e.target.value })} placeholder="Content" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-ink-3">
            Type
            <Select className="mt-1" value={form.kind} onChange={(e) => set({ kind: e.target.value as KnowledgeNode['kind'] })}>
              {NODE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </label>
          <label className="text-[11px] text-ink-3">
            Tags (comma separated)
            <Input className="mt-1" value={form.tags.join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) })} />
          </label>
          <label className="text-[11px] text-ink-3 col-span-2">
            Collections
            <div className="mt-1 flex flex-wrap gap-1.5">
              {collections.map((c) => {
                const active = form.collectionIds.includes(c.id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? 'border-accent bg-accent-soft text-accent' : 'border-hair text-ink-2'}`}
                    onClick={() => set({ collectionIds: active ? form.collectionIds.filter((x) => x !== c.id) : [...form.collectionIds, c.id] })}
                  >
                    <FolderPlus size={10} className="mr-1 inline" />{c.name}
                  </button>
                )
              })}
              {collections.length === 0 && <span className="text-[11px] text-ink-3">No collections yet — you can create them in the left sidebar.</span>}
            </div>
          </label>
        </div>
        {related.length > 0 && (
          <div className="rounded-md border border-hair bg-panel-2 p-2">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">Entries sharing tags with this one</div>
            <div className="flex flex-wrap gap-1">
              {related.map((r) => (
                <span key={r.id} className="rounded bg-panel px-1.5 py-0.5 text-[11px] text-ink-2">{r.title}</span>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between">
          {form.id ? (
            <Button type="button" variant="danger" onClick={() => void onDelete(form.id)}><Trash2 size={13} /> Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">{form.id ? 'Save changes' : 'Create entry'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
