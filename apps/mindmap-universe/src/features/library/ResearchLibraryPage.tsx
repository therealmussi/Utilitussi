import { useMemo, useState } from 'react'
import { BookOpen, Plus, Trash2, ExternalLink, Link2, BadgeCheck, Bot, FileText, ShieldQuestion } from 'lucide-react'
import type { Source, SourceType } from '@/types'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { Button, Input, Modal, Select, Textarea, Tag, EmptyState, SectionTitle } from '@/components/ui'
import { truncate } from '@/utils/text'

const ORIGIN_META: Record<Source['origin'], { label: string; icon: React.ReactNode; color: string }> = {
  user: { label: 'Original source', icon: <BadgeCheck size={11} />, color: 'var(--color-good)' },
  ai: { label: 'AI-generated (not verified)', icon: <Bot size={11} />, color: 'var(--color-warn)' },
  import: { label: 'Imported', icon: <FileText size={11} />, color: 'var(--color-accent)' },
  unverified: { label: 'Unverified information', icon: <ShieldQuestion size={11} />, color: 'var(--color-ink-3)' },
}

export function ResearchLibraryPage() {
  const sources = useUniverseData().sources
  const { nodes } = useUniverseData()
  const addSource = useAppStore((s) => s.addSource)
  const updateSource = useAppStore((s) => s.updateSource)
  const deleteSource = useAppStore((s) => s.deleteSource)
  const updateNode = useAppStore((s) => s.updateNode)

  const [edit, setEdit] = useState<Source | null>(null)
  const [query, setQuery] = useState('')
  const [linkSource, setLinkSource] = useState<Source | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return sources.filter((s) => `${s.title} ${s.author} ${s.tags.join(' ')} ${s.notes}`.toLowerCase().includes(q))
  }, [sources, query])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Research Library</h1>
          <p className="text-xs text-ink-2">Articles, books, papers, videos and notes — linkable to any concept. No citation is ever invented by the app.</p>
        </div>
        <Button variant="primary" onClick={() => setEdit(makeDraftSource(''))}>
          <Plus size={14} /> New source
        </Button>
      </div>

      <Input className="mb-4 max-w-md" placeholder="Search the library…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={36} />} title="The library is empty" hint="Save the material that feeds your concepts: articles, papers, books, videos." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const linked = nodes.filter((n) => n.sourceIds.includes(s.id))
            const origin = ORIGIN_META[s.origin]
            return (
              <div key={s.id} className="group rounded-lg border border-hair bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="mt-0.5 text-[11px] text-ink-2">
                      {s.author && <span>{s.author} · </span>}
                      {s.publicationDate && <span>{s.publicationDate} · </span>}
                      <span>{s.type}</span>
                    </div>
                  </div>
                  <button className="text-ink-3 opacity-0 group-hover:opacity-100 hover:text-bad" onClick={() => void deleteSource(s.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {s.notes && <div className="mt-2 text-xs text-ink-2">{truncate(s.notes, 160)}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded bg-panel-3 px-1.5 py-0.5 text-[10px]" style={{ color: origin.color }}>{origin.icon} {origin.label}</span>
                  {s.tags.map((t) => <Tag key={t} label={`#${t}`} />)}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent hover:underline">
                      <ExternalLink size={11} /> open
                    </a>
                  )}
                  <button className="flex items-center gap-1 text-ink-2 hover:text-ink" onClick={() => setLinkSource(s)}>
                    <Link2 size={11} /> {linked.length} linked
                  </button>
                  <button className="ml-auto text-ink-3 hover:text-ink" onClick={() => setEdit(s)}>edit</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {edit && <SourceModal source={edit} onSave={async (data) => { if (data.id) await updateSource(data.id, data); else await addSource(data.title || 'Untitled source', data); setEdit(null) }} onClose={() => setEdit(null)} />}

      <Modal open={!!linkSource} onClose={() => setLinkSource(null)} title={`Link "${truncate(linkSource?.title ?? '', 40)}" to concepts`}>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {nodes.map((n) => {
            const active = linkSource ? nodes.find((x) => x.id === n.id)?.sourceIds.includes(linkSource.id) : false
            void active
            const linked = linkSource && n.sourceIds.includes(linkSource.id)
            return (
              <button
                key={n.id}
                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm ${linked ? 'text-accent' : 'text-ink hover:bg-panel-2'}`}
                onClick={async () => {
                  if (!linkSource) return
                  await updateNode(n.id, {
                    sourceIds: linked ? n.sourceIds.filter((x) => x !== linkSource.id) : [...n.sourceIds, linkSource.id],
                  })
                }}
              >
                <span className="truncate">{n.title}</span>
                <Tag label={linked ? 'linked' : 'link'} color={linked ? '#4f8cff' : undefined} />
              </button>
            )
          })}
        </div>
        <div className="mt-2 text-[11px] text-ink-3">Node ↔ source links are stored per node; removing them never deletes data.</div>
      </Modal>
    </div>
  )
}

function makeDraftSource(id: string): Source {
  void id
  const now = new Date().toISOString()
  return { id: '', universeId: '', title: '', type: 'article', url: '', author: '', publicationDate: '', notes: '', tags: [], origin: 'user', createdAt: now }
}

function SourceModal({ source, onSave, onClose }: { source: Source; onSave: (s: Source) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<Source>(source)
  if (source.id !== form.id) setForm(source)
  const set = (patch: Partial<Source>) => setForm((f) => ({ ...f, ...patch }))
  return (
    <Modal open onClose={onClose} title={form.id ? 'Edit source' : 'New source'} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void onSave(form) }}>
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title" required />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-ink-3">
            Type
            <Select className="mt-1" value={form.type} onChange={(e) => set({ type: e.target.value as SourceType })}>
              {['web', 'article', 'book', 'paper', 'report', 'video', 'document', 'note'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </label>
          <label className="text-[11px] text-ink-3">
            Transparency
            <Select className="mt-1" value={form.origin} onChange={(e) => set({ origin: e.target.value as Source['origin'] })}>
              {Object.entries(ORIGIN_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </label>
          <label className="text-[11px] text-ink-3">
            URL
            <Input className="mt-1" value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
          </label>
          <label className="text-[11px] text-ink-3">
            Author (only if you know it)
            <Input className="mt-1" value={form.author} onChange={(e) => set({ author: e.target.value })} placeholder="Leave empty if unknown" />
          </label>
          <label className="text-[11px] text-ink-3">
            Publication date (only if known)
            <Input className="mt-1" type="date" value={form.publicationDate} onChange={(e) => set({ publicationDate: e.target.value })} />
          </label>
          <label className="text-[11px] text-ink-3">
            Tags (comma separated)
            <Input className="mt-1" value={form.tags.join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
          </label>
        </div>
        <Textarea rows={4} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Your notes about this source" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save source</Button>
        </div>
      </form>
    </Modal>
  )
}
